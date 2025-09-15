import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  @Length(4, 10, { message: 'OTP code must be between 4 and 10 characters' })
  @Transform(({ value }) => value?.trim())
  otpCode?: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 100, { message: 'Old password must be at least 6 characters long' })
  @Transform(({ value }) => value?.trim())
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 100, { message: 'New password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'New password must include uppercase, lowercase, number, and special character',
  })
  @Transform(({ value }) => value?.trim())
  newPassword: string;
}
