import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  @MinLength(10)
  reason!: string;
}

export class ResolveDisputeDto {
  @IsIn(['resolved', 'refunded'])
  outcome!: 'resolved' | 'refunded';

  @IsOptional()
  @IsString()
  note?: string;
}
