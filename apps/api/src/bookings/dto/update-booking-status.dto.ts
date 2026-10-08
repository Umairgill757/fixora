import { IsIn } from 'class-validator';
import { BookingStatus } from '@prisma/client';

const STATUSES = Object.values(BookingStatus);

export class UpdateBookingStatusDto {
  @IsIn(STATUSES)
  status: BookingStatus;
}
