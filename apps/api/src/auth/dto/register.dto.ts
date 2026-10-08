import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/** Roles a user may self-register as. ADMIN is never self-assignable. */
export const SELF_REGISTER_ROLES = ['CUSTOMER', 'TECHNICIAN', 'BUSINESS_OWNER'] as const;

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsIn([...SELF_REGISTER_ROLES])
  role?: (typeof SELF_REGISTER_ROLES)[number];

  @IsOptional()
  @IsString()
  phone?: string;
}
