import { IsEnum } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

export class VerifyTechnicianDto {
  @IsEnum(VerificationStatus)
  status!: VerificationStatus;
}
