import { Optional } from '@nestjs/common';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class PasscodeLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^[0-9]+$/, { message: 'Passcode must contain only numbers' })
  passcode: string;

  @IsString()
  @Optional()
  ipAddress: string;

  @IsString()
  @Optional()
  deviceName: string;

  @IsString()
  @Optional()
  operatingSystem: string;
}
