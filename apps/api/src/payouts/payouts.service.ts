import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePayoutDto } from './dto/create-payout.dto.js';

interface RequestUser {
  id: string;
  role: string;
}

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  private commissionPct(): number {
    const n = Number(process.env.PLATFORM_COMMISSION_PCT ?? '10');
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 10;
  }

  /** What a technician has earned (settled bookings, net of commission) minus paid out. */
  async earnings(technicianId: string) {
    const settled = await this.prisma.booking.findMany({
      where: { technicianId, status: { in: [BookingStatus.INVOICED, BookingStatus.SETTLED] } },
      select: { totalPrice: true, commission: true },
    });
    const pct = this.commissionPct();
    const gross = settled.reduce((s, b) => s + (b.totalPrice ?? 0), 0);
    const commission = settled.reduce(
      (s, b) => s + (b.commission ?? (b.totalPrice ?? 0) * (pct / 100)),
      0,
    );
    const paidOut = await this.prisma.payout.aggregate({
      where: { technicianId, status: { in: ['paid', 'processing'] } },
      _sum: { amount: true },
    });
    return {
      jobsSettled: settled.length,
      gross: Math.round(gross * 100) / 100,
      commission: Math.round(commission * 100) / 100,
      net: Math.round((gross - commission) * 100) / 100,
      paidOut: paidOut._sum.amount ?? 0,
      payable: Math.round((gross - commission - (paidOut._sum.amount ?? 0)) * 100) / 100,
    };
  }

  /** Admin records a payout (manual bank transfer until a payouts gateway is added). */
  async create(dto: CreatePayoutDto, user: RequestUser) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only.');
    const tech = await this.prisma.technician.findUnique({ where: { id: dto.technicianId } });
    if (!tech) throw new NotFoundException('Technician not found.');
    const { payable } = await this.earnings(dto.technicianId);
    if (dto.amount > payable) {
      throw new BadRequestException(`Amount exceeds payable balance (Rs ${payable}).`);
    }
    return this.prisma.payout.create({
      data: { technicianId: dto.technicianId, amount: dto.amount, status: 'processing' },
    });
  }

  async markPaid(id: string, user: RequestUser) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only.');
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found.');
    return this.prisma.payout.update({ where: { id }, data: { status: 'paid' } });
  }

  async list(user: RequestUser) {
    if (user.role === 'ADMIN') {
      return this.prisma.payout.findMany({
        orderBy: { createdAt: 'desc' },
        include: { technician: { include: { user: { select: { name: true, email: true } } } } },
      });
    }
    if (user.role === 'TECHNICIAN') {
      const tech = await this.prisma.technician.findUnique({ where: { userId: user.id } });
      if (!tech) throw new NotFoundException('No technician profile.');
      return this.prisma.payout.findMany({
        where: { technicianId: tech.id },
        orderBy: { createdAt: 'desc' },
      });
    }
    throw new ForbiddenException('Not allowed.');
  }

  async myEarnings(user: RequestUser) {
    if (user.role !== 'TECHNICIAN') throw new ForbiddenException('Technicians only.');
    const tech = await this.prisma.technician.findUnique({ where: { userId: user.id } });
    if (!tech) throw new NotFoundException('No technician profile.');
    return this.earnings(tech.id);
  }
}
