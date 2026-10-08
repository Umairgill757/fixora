import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDisputeDto, ResolveDisputeDto } from './dto/dispute.dto.js';

interface RequestUser {
  id: string;
  role: string;
}

const DISPUTABLE = [BookingStatus.PAID, BookingStatus.DISPATCHED, BookingStatus.ASSIGNED, BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED, BookingStatus.INVOICED];

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customer opens a dispute; booking moves to DISPUTED. */
  async create(bookingId: string, dto: CreateDisputeDto, user: RequestUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.customerId !== user.id) {
      throw new ForbiddenException('You can only dispute your own bookings.');
    }
    if (!DISPUTABLE.includes(booking.status)) {
      throw new BadRequestException(`Bookings in ${booking.status} cannot be disputed.`);
    }
    const open = await this.prisma.dispute.findFirst({
      where: { bookingId, status: 'open' },
    });
    if (open) throw new BadRequestException('A dispute is already open for this booking.');

    const [dispute] = await this.prisma.$transaction([
      this.prisma.dispute.create({ data: { bookingId, reason: dto.reason } }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.DISPUTED },
      }),
    ]);
    return dispute;
  }

  async list(user: RequestUser, status?: string) {
    if (user.role === 'ADMIN') {
      return this.prisma.dispute.findMany({
        where: status ? { status } : {},
        orderBy: { createdAt: 'desc' },
        include: { booking: { include: { business: { select: { name: true } } } } },
      });
    }
    if (user.role === 'BUSINESS_OWNER') {
      return this.prisma.dispute.findMany({
        where: {
          ...(status ? { status } : {}),
          booking: { business: { ownerId: user.id } },
        },
        orderBy: { createdAt: 'desc' },
        include: { booking: true },
      });
    }
    return this.prisma.dispute.findMany({
      where: { ...(status ? { status } : {}), booking: { customerId: user.id } },
      orderBy: { createdAt: 'desc' },
      include: { booking: true },
    });
  }

  /** Admin resolves: 'resolved' closes in business favour, 'refunded' refunds the customer. */
  async resolve(id: string, dto: ResolveDisputeDto, user: RequestUser) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only.');
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { booking: { include: { payment: true } } },
    });
    if (!dispute) throw new NotFoundException('Dispute not found.');
    if (dispute.status !== 'open') throw new BadRequestException('Dispute already closed.');

    if (dto.outcome === 'refunded') {
      await this.prisma.$transaction([
        this.prisma.dispute.update({ where: { id }, data: { status: 'refunded' } }),
        this.prisma.booking.update({
          where: { id: dispute.bookingId },
          data: { status: BookingStatus.CANCELLED },
        }),
        ...(dispute.booking.payment
          ? [
              this.prisma.payment.update({
                where: { id: dispute.booking.payment.id },
                data: { status: 'refunded' },
              }),
            ]
          : []),
      ]);
      return { ...dispute, status: 'refunded' };
    }

    await this.prisma.$transaction([
      this.prisma.dispute.update({ where: { id }, data: { status: 'resolved' } }),
      // Return the booking to its pre-dispute flow end-state.
      this.prisma.booking.update({
        where: { id: dispute.bookingId },
        data: { status: BookingStatus.SETTLED },
      }),
    ]);
    return { ...dispute, status: 'resolved' };
  }
}
