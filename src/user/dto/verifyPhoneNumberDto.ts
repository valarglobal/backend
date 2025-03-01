import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPhoneNumberDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}
