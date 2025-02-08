import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResetWalletPinDto {
  @IsString()
  @IsNotEmpty()
  otpCode: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{4}$/, {
    message: 'PIN must be exactly 4 digits',
  })
  pin: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{4}$/, {
    message: 'PIN must be exactly 4 digits',
  })
  confirmPin: string;
}
