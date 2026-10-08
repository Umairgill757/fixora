import { ForbiddenException, Injectable } from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

interface RequestUser {
  id: string;
  role: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private assertAdmin(user: RequestUser) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only.');
  }

  async overview(user: RequestUser) {
    this.assertAdmin(user);
    const [users, businesses, bookings, payments, disputes, techs] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: true }),
      this.prisma.business.count(),
      this.prisma.booking.groupBy({ by: ['status'], _count: true }),
      this.prisma.payment.aggregate({
        where: { status: 'succeeded' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.dispute.count({ where: { status: 'open' } }),
      this.prisma.technician.count({ where: { verificationStatus: 'PENDING' } }),
    ]);
    return {
      users: Object.fromEntries(users.map((u) => [u.role, u._count])),
      businesses,
      bookings: Object.fromEntries(bookings.map((b) => [b.status, b._count])),
      revenue: payments._sum.amount ?? 0,
      successfulPayments: payments._count,
      openDisputes: disputes,
      pendingTechnicians: techs,
    };
  }

  async users(user: RequestUser) {
    this.assertAdmin(user);
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      take: 100,
    });
  }

  async bookings(user: RequestUser) {
    this.assertAdmin(user);
    return this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        business: { select: { name: true } },
        payment: { select: { status: true, amount: true } },
      },
    });
  }
}
