import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPhoneNumberDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}
