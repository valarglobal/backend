import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsOptional()
  otpCode: string;

  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  newPassword: string;
}
