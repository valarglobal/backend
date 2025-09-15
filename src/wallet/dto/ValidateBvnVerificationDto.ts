import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class ValidateBvnVerificationDto {
  @IsNotEmpty({ message: 'BVN is required' })
  @IsString({ message: 'BVN must be a string' })
  @Matches(/^[0-9]{11}$/, {
    message: 'BVN must be exactly 11 digits',
  })
  bvn: string;

  @IsNotEmpty({ message: 'Verification ID is required' })
  @IsString({ message: 'Verification ID must be a string' })
  @Length(5, 50, {
    message: 'Verification ID must be between 5 and 50 characters',
  })
  verificationId: string;

  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString({ message: 'OTP code must be a string' })
  @Matches(/^[0-9]{4,6}$/, {
    message: 'OTP code must be 4 to 6 digits',
  })
  otpCode: string;

  @IsOptional()
  @IsBoolean({ message: 'isBusiness must be a boolean value' })
  isBusiness: boolean = false;
}
