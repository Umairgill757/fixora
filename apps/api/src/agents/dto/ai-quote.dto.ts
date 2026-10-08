import { IsOptional, IsString } from 'class-validator';

export class AiQuoteDto {
  @IsString()
  businessId!: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsString()
  problem!: string;
}
