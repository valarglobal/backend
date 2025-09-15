import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class PasscodeLoginDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be valid' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsNotEmpty({ message: 'Passcode is required' })
  @Matches(/^\d{6}$/, { message: 'Passcode must be exactly 6 digits' })
  passcode: string;

  @IsOptional()
  @IsString()
  @MaxLength(45, { message: 'IP address too long' }) // IPv6 max length
  @Transform(({ value }) => value?.trim())
  ipAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  operatingSystem?: string;
}
