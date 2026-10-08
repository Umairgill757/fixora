import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

interface RequestUser {
  id: string;
  role: string;
}

/**
 * Allowed status transitions. Money moves only on explicit transitions.
 * The QUOTED -> PAID step is wired once Umair picks the payment option
 * (full Stripe test-mode integration vs. stub) — see the blocked todo.
 */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.QUOTED]: [BookingStatus.PAID, BookingStatus.CANCELLED],
  [BookingStatus.PAID]: [BookingStatus.DISPATCHED, BookingStatus.CANCELLED, BookingStatus.DISPUTED],
  [BookingStatus.DISPATCHED]: [BookingStatus.ASSIGNED, BookingStatus.CANCELLED],
  [BookingStatus.ASSIGNED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.DISPUTED],
  [BookingStatus.COMPLETED]: [BookingStatus.INVOICED, BookingStatus.DISPUTED],
  [BookingStatus.INVOICED]: [BookingStatus.SETTLED, BookingStatus.DISPUTED],
  [BookingStatus.SETTLED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.DISPUTED]: [BookingStatus.SETTLED, BookingStatus.CANCELLED],
};

const BOOKING_INCLUDE = {
  business: { select: { id: true, name: true, slug: true, city: true } },
  service: { select: { id: true, name: true, basePrice: true, unit: true } },
  technician: { select: { id: true, rating: true } },
  payment: true,
} as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateBookingDto, user: RequestUser) {
    const business = await this.prisma.business.findUnique({ where: { id: dto.businessId } });
    if (!business) throw new NotFoundException('Business not found.');

    let service: { id: string; basePrice: number } | null = null;
    if (dto.serviceId) {
      service = await this.prisma.service.findFirst({
        where: { id: dto.serviceId, businessId: dto.businessId, active: true },
      });
      if (!service) throw new BadRequestException('Service does not belong to this business.');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future.');
    }

    const totalPrice = service?.basePrice ?? null;

    const booking = await this.prisma.booking.create({
      data: {
        customerId: user.id,
        businessId: dto.businessId,
        serviceId: service?.id,
        scheduledAt,
        address: dto.address,
        notes: dto.notes,
        totalPrice,
        status: BookingStatus.QUOTED,
        payment: { create: { amount: totalPrice ?? 0, status: 'pending' } },
      },
      include: BOOKING_INCLUDE,
    });

    // Notify (fire-and-forget; failures never break booking creation).
    void (async () => {
      const [customer, owner] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: user.id } }),
        this.prisma.business.findUnique({ where: { id: dto.businessId }, select: { owner: true, name: true } }),
      ]);
      const when = scheduledAt.toLocaleString();
      if (customer) void this.notifications.bookingRequested(customer, business.name, when);
      if (owner?.owner) void this.notifications.bookingConfirmedOwner(owner.owner, customer?.name ?? 'A customer', when);
    })();

    return booking;
  }

  async list(user: RequestUser) {
    if (user.role === 'ADMIN') {
      return this.prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, include: BOOKING_INCLUDE });
    }
    if (user.role === 'BUSINESS_OWNER') {
      return this.prisma.booking.findMany({
        where: { business: { ownerId: user.id } },
        orderBy: { createdAt: 'desc' },
        include: BOOKING_INCLUDE,
      });
    }
    return this.prisma.booking.findMany({
      where: { customerId: user.id },
      orderBy: { createdAt: 'desc' },
      include: BOOKING_INCLUDE,
    });
  }

  async findOne(id: string, user: RequestUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        ...BOOKING_INCLUDE,
        business: { select: { id: true, name: true, slug: true, city: true, ownerId: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    this.assertVisible(booking, user);
    return booking;
  }

  async updateStatus(id: string, status: BookingStatus, user: RequestUser) {
    const booking = await this.findOne(id, user);

    // Customers may only cancel their own early-stage bookings.
    if (user.role === 'CUSTOMER') {
      const cancellable: BookingStatus[] = [BookingStatus.QUOTED, BookingStatus.PAID];
      const isCancellable = cancellable.includes(booking.status);
      if (!(status === BookingStatus.CANCELLED && isCancellable && booking.customerId === user.id)) {
        throw new ForbiddenException('Customers can only cancel their own quoted/paid bookings.');
      }
    }
    // Business owners act only on their own businesses' bookings.
    if (user.role === 'BUSINESS_OWNER') {
      const own = await this.prisma.business.findFirst({
        where: { id: booking.businessId, ownerId: user.id },
      });
      if (!own) throw new ForbiddenException('Not your business booking.');
    }

    const allowed = TRANSITIONS[booking.status];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot move booking from ${booking.status} to ${status}.`);
    }
    return this.prisma.booking.update({
      where: { id },
      data: { status },
      include: BOOKING_INCLUDE,
    });
  }

  /**
   * Dispatch: assign a verified technician to a DISPATCHED booking.
   * Only the business owner (or admin) can dispatch.
   */
  async assignTechnician(id: string, technicianId: string, user: RequestUser) {
    const booking = await this.findOne(id, user);
    if (user.role === 'CUSTOMER') {
      throw new ForbiddenException('Only the business can dispatch technicians.');
    }
    if (user.role === 'BUSINESS_OWNER') {
      const own = await this.prisma.business.findFirst({
        where: { id: booking.businessId, ownerId: user.id },
      });
      if (!own) throw new ForbiddenException('Not your business booking.');
    }
    if (booking.status !== BookingStatus.DISPATCHED) {
      throw new BadRequestException(`Booking is ${booking.status}; only DISPATCHED bookings can be assigned.`);
    }
    const tech = await this.prisma.technician.findUnique({
      where: { id: technicianId },
      include: { user: true },
    });
    if (!tech || tech.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new BadRequestException('Technician is not verified.');
    }
    const assigned = await this.prisma.booking.update({
      where: { id },
      data: { technicianId, status: BookingStatus.ASSIGNED },
      include: BOOKING_INCLUDE,
    });

    void (async () => {
      const customer = await this.prisma.user.findUnique({ where: { id: booking.customerId } });
      if (customer) {
        void this.notifications.technicianAssigned(
          tech.user,
          customer,
          (booking.scheduledAt ?? new Date()).toLocaleString(),
          booking.address,
        );
      }
    })();

    return assigned;
  }

  private assertVisible(
    booking: { customerId: string; business: { ownerId: string } },
    user: RequestUser,
  ) {
    const ok =
      user.role === 'ADMIN' ||
      booking.customerId === user.id ||
      (user.role === 'BUSINESS_OWNER' && booking.business.ownerId === user.id);
    if (!ok) throw new ForbiddenException('You cannot view this booking.');
  }
}
