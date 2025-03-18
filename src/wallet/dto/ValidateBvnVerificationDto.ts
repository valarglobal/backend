import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ValidateBvnVerificationDto {
  @IsNotEmpty()
  @IsString()
  bvn: string;

  @IsNotEmpty()
  @IsString()
  verificationId: string;

  @IsNotEmpty()
  @IsString()
  otpCode: string;

  @IsOptional()
  @IsBoolean()
  isBusiness: boolean = false;
}
