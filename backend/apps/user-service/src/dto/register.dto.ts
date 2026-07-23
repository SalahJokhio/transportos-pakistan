import { IsString, IsEmail, IsOptional, IsEnum, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@app/common';

export class RegisterDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '03001234567' })
  @IsString()
  @Matches(/^(\+92|0092|0)(3\d{9})$/, { message: 'Invalid Pakistani phone number' })
  phone: string;

  @ApiPropertyOptional({ example: 'ali@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.PASSENGER })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: '35202-1234567-1' })
  @IsString()
  @IsOptional()
  cnic?: string;
}

export class LoginDto {
  @ApiProperty({ example: '03001234567' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  password: string;

  // Optional 6-digit TOTP, required only when the account has 2FA enabled.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  totp?: string;
}

export class SendOtpDto {
  @ApiProperty({ example: '03001234567' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'LOGIN', enum: ['LOGIN', 'REGISTER', 'RESET_PASSWORD'] })
  @IsString()
  purpose: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '03001234567' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'LOGIN' })
  @IsString()
  purpose: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: '03001234567' })
  @IsString()
  @Matches(/^(\+92|0092|0)(3\d{9})$/, { message: 'Invalid Pakistani phone number' })
  phone: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '03001234567' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  otp: string;

  @ApiProperty({ example: 'NewPass123!' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cnic?: string;
}
