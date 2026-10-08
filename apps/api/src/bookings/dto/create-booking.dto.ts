import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  businessId: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsDateString()
  scheduledAt: string;

  @IsString()
  @MinLength(5)
  address: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
