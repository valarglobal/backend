import { Optional } from '@nestjs/common';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasscodeLoginDto {
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
    example: '123456',
    description: 'Six-digit numeric passcode for login',
    required: true,
    minLength: 6,
    maxLength: 6,
    pattern: '^[0-9]+$'
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^[0-9]+$/, { message: 'Passcode must contain only numbers' })
  passcode: string;

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
