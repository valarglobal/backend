import { Optional } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

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
