import { IsNotEmpty, IsString } from 'class-validator';

export class ValidatePhoneNumberDto {
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;
}
