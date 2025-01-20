import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ChangePinDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{4}$/, {
    message: 'PIN must be exactly 4 digits',
  })
  oldPin: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{4}$/, {
    message: 'PIN must be exactly 4 digits',
  })
  newPin: string;
}
