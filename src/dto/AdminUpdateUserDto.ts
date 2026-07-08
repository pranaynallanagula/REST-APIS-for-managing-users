import { IsEnum, IsOptional } from 'class-validator';
import { Role } from '../entities/Role';
import { UpdateUserDto } from './UpdateUserDto';

/** Extends the standard update payload with the ability to change a user's role. Admin-only. */
export class AdminUpdateUserDto extends UpdateUserDto {
  @IsOptional()
  @IsEnum(Role, { message: 'role must be one of USER or ADMIN' })
  role?: Role;
}
