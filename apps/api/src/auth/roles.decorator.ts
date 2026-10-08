import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/** Restrict a route to specific roles. Use with RolesGuard + JwtAuthGuard. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
