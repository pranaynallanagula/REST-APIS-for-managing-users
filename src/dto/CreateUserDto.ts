import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../entities/Role';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @MaxLength(255)
  password!: string;

  @IsOptional()
  @IsEnum(Role, { message: 'role must be one of USER or ADMIN' })
  role?: Role;
}
