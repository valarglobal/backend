import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to verify',
    format: 'email',
    required: true
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'One-time verification code sent to email',
    required: true,
    minLength: 6,
    maxLength: 6
  })
  @IsNotEmpty()
  @IsString()
  otpCode: string;
}
