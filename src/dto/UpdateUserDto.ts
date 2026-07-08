import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Fields a user (or admin) may update about a profile.
 * Role is intentionally excluded — only AdminUpdateUserDto can change it.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @MaxLength(255)
  password?: string;
}
