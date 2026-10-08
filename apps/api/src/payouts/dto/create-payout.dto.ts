import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePayoutDto {
  @IsString()
  technicianId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
