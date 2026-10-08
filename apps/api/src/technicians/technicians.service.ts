import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApplyTechnicianDto } from './dto/apply-technician.dto.js';
import { UpdateTechnicianDto } from './dto/update-technician.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

interface RequestUser {
  id: string;
  role: string;
}

const TECH_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  business: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TechniciansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async apply(dto: ApplyTechnicianDto, user: RequestUser) {
    if (user.role !== 'TECHNICIAN') {
      throw new ForbiddenException('Only technician accounts can apply.');
    }
    const existing = await this.prisma.technician.findUnique({ where: { userId: user.id } });
    if (existing) throw new BadRequestException('You already have a technician profile.');
    return this.prisma.technician.create({
      data: {
        userId: user.id,
        skills: JSON.stringify(dto.skills),
        serviceAreas: JSON.stringify(dto.serviceAreas),
        availability: JSON.stringify(dto.availability ?? {}),
        verificationStatus: VerificationStatus.PENDING,
      },
      include: TECH_INCLUDE,
    });
  }

  async myProfile(user: RequestUser) {
    const tech = await this.prisma.technician.findUnique({
      where: { userId: user.id },
      include: TECH_INCLUDE,
    });
    if (!tech) throw new NotFoundException('No technician profile found.');
    return tech;
  }

  async updateMyProfile(dto: UpdateTechnicianDto, user: RequestUser) {
    const tech = await this.myProfile(user);
    return this.prisma.technician.update({
      where: { id: tech.id },
      data: {
        ...(dto.skills ? { skills: JSON.stringify(dto.skills) } : {}),
        ...(dto.serviceAreas ? { serviceAreas: JSON.stringify(dto.serviceAreas) } : {}),
        ...(dto.availability ? { availability: JSON.stringify(dto.availability) } : {}),
      },
      include: TECH_INCLUDE,
    });
  }

  async list(status: VerificationStatus | undefined, user: RequestUser) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only.');
    return this.prisma.technician.findMany({
      where: status ? { verificationStatus: status } : {},
      orderBy: { createdAt: 'desc' },
      include: TECH_INCLUDE,
    });
  }

  async verify(id: string, status: VerificationStatus, user: RequestUser) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only.');
    const tech = await this.prisma.technician.findUnique({ where: { id } });
    if (!tech) throw new NotFoundException('Technician not found.');
    return this.prisma.technician.update({
      where: { id },
      data: { verificationStatus: status },
      include: TECH_INCLUDE,
    });
  }

  /** Jobs currently assigned to / in progress for this technician. */
  async myJobs(user: RequestUser) {
    const tech = await this.myProfile(user);
    return this.prisma.booking.findMany({
      where: {
        technicianId: tech.id,
        status: { in: [BookingStatus.ASSIGNED, BookingStatus.IN_PROGRESS] },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        business: { select: { id: true, name: true, city: true } },
        service: { select: { id: true, name: true } },
      },
    });
  }

  private async ownJob(bookingId: string, user: RequestUser) {
    const tech = await this.myProfile(user);
    if (tech.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException('Your profile is not verified yet.');
    }
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.technicianId !== tech.id) {
      throw new NotFoundException('Job not found.');
    }
    return { tech, booking };
  }

  async acceptJob(bookingId: string, user: RequestUser) {
    const { booking } = await this.ownJob(bookingId, user);
    if (booking.status !== BookingStatus.ASSIGNED) {
      throw new BadRequestException(`Job is ${booking.status}; only ASSIGNED jobs can be accepted.`);
    }
    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.IN_PROGRESS },
    });
  }

  async declineJob(bookingId: string, user: RequestUser) {
    const { booking } = await this.ownJob(bookingId, user);
    if (booking.status !== BookingStatus.ASSIGNED) {
      throw new BadRequestException(`Job is ${booking.status}; only ASSIGNED jobs can be declined.`);
    }
    // Back to the dispatch pool.
    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.DISPATCHED, technicianId: null },
    });
  }

  async completeJob(bookingId: string, user: RequestUser) {
    const { tech, booking } = await this.ownJob(bookingId, user);
    if (booking.status !== BookingStatus.IN_PROGRESS) {
      throw new BadRequestException(`Job is ${booking.status}; only IN_PROGRESS jobs can be completed.`);
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.COMPLETED },
      }),
      this.prisma.technician.update({
        where: { id: tech.id },
        data: { completedJobs: { increment: 1 } },
      }),
    ]);

    void (async () => {
      const full = await this.prisma.booking.findUnique({
        where: { id: booking.id },
        include: { customer: true, business: { select: { name: true } } },
      });
      if (full?.customer) void this.notifications.jobCompleted(full.customer, full.business.name);
    })();

    return updated;
  }
}
