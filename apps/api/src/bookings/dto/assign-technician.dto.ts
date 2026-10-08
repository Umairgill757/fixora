import { IsString } from 'class-validator';

export class AssignTechnicianDto {
  @IsString()
  technicianId!: string;
}
