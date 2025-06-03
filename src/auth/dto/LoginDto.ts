import { Optional } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    required: true,
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'yourSecurePassword123',
    description: 'User password',
    required: true,
    format: 'password'
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    example: '192.168.1.1',
    description: 'IP address of the client',
    required: false
  })
  @IsString()
  @Optional()
  ipAddress: string;

  @ApiProperty({
    example: 'iPhone 13',
    description: 'Name of the device used for login',
    required: false
  })
  @IsString()
  @Optional()
  deviceName: string;

  @ApiProperty({
    example: 'iOS 15.0',
    description: 'Operating system of the device',
    required: false
  })
  @IsString()
  @Optional()
  operatingSystem: string;
}
