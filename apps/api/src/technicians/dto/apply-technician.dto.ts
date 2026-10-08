import { IsArray, IsObject, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class ApplyTechnicianDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  skills!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serviceAreas!: string[];

  @IsOptional()
  @IsObject()
  availability?: Record<string, string[][]>;
}
