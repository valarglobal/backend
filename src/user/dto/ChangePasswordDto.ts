import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    example: '123456',
    description: 'One-time password for verification (if required)',
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @IsOptional()
  otpCode: string;

  @ApiProperty({
    example: 'CurrentPass123!',
    description: 'Current password',
    required: true,
    format: 'password'
  })
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description: 'New password',
    required: true,
    format: 'password'
  })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}
