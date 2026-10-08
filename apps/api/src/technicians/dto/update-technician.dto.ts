import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateTechnicianDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceAreas?: string[];

  @IsOptional()
  @IsObject()
  availability?: Record<string, string[][]>;
}
