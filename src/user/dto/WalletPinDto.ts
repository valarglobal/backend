import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class WalletPinDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{4}$/, {
    message: 'PIN must be exactly 4 digits',
  })
  pin: string;
}
