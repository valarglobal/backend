import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user',
    format: 'email',
    required: true
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description: 'New password for the account',
    format: 'password',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description: 'Confirm the new password',
    format: 'password',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}
