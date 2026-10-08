import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

interface RequestUser {
  id: string;
  role: string;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private commissionPct(): number {
    const n = Number(process.env.PLATFORM_COMMISSION_PCT ?? '10');
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 10;
  }

  /** Owner/admin generates the invoice once the job is COMPLETED. */
  async generate(bookingId: string, user: RequestUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        business: { select: { ownerId: true } },
        service: { select: { name: true } },
        invoice: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (user.role === 'BUSINESS_OWNER' && booking.business.ownerId !== user.id) {
      throw new ForbiddenException('Not your business booking.');
    }
    if (user.role === 'CUSTOMER') throw new ForbiddenException('Only the business can invoice.');
    if (booking.invoice) return booking.invoice;
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException(`Booking is ${booking.status}; only COMPLETED bookings can be invoiced.`);
    }
    const amount = booking.totalPrice ?? 0;
    if (amount <= 0) throw new BadRequestException('Booking has no amount to invoice.');

    const commission = Math.round(amount * (this.commissionPct() / 100) * 100) / 100;
    const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invoice] = await this.prisma.$transaction([
      this.prisma.invoice.create({
        data: { bookingId: booking.id, amount, status: 'unpaid', dueAt },
      }),
      this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.INVOICED, commission },
      }),
    ]);
    return invoice;
  }

  async findOne(id: string, user: RequestUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            business: { select: { ownerId: true, name: true } },
            service: { select: { name: true } },
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    const ok =
      user.role === 'ADMIN' ||
      invoice.booking.customerId === user.id ||
      (user.role === 'BUSINESS_OWNER' && invoice.booking.business.ownerId === user.id);
    if (!ok) throw new ForbiddenException('You cannot view this invoice.');
    return invoice;
  }
}
