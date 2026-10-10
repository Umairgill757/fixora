import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

interface RequestUser {
  id: string;
  role: string;
}

const REVIEWABLE: BookingStatus[] = [BookingStatus.COMPLETED, BookingStatus.INVOICED, BookingStatus.SETTLED];

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customer reviews a finished booking; updates business + technician ratings. */
  async create(bookingId: string, dto: CreateReviewDto, user: RequestUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { business: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.customerId !== user.id) {
      throw new ForbiddenException('You can only review your own bookings.');
    }
    if (!REVIEWABLE.includes(booking.status)) {
      throw new BadRequestException('You can only review completed jobs.');
    }
    const existing = await this.prisma.review.findFirst({
      where: { bookingId, authorId: user.id },
    });
    if (existing) throw new BadRequestException('You already reviewed this booking.');

    const review = await this.prisma.review.create({
      data: { bookingId, authorId: user.id, rating: dto.rating, comment: dto.comment },
    });

    // Recompute business rating as the average of its reviews.
    const agg = await this.prisma.review.aggregate({
      where: { booking: { businessId: booking.businessId } },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.business.update({
      where: { id: booking.businessId },
      data: { rating: agg._avg.rating ?? 0 },
    });

    // Same for the technician, when one was assigned.
    if (booking.technicianId) {
      const tAgg = await this.prisma.review.aggregate({
        where: { booking: { technicianId: booking.technicianId } },
        _avg: { rating: true },
      });
      await this.prisma.technician.update({
        where: { id: booking.technicianId },
        data: { rating: tAgg._avg.rating ?? 0 },
      });
    }
    return review;
  }

  async forBusiness(businessId: string) {
    return this.prisma.review.findMany({
      where: { booking: { businessId } },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } },
      take: 50,
    });
  }
}
