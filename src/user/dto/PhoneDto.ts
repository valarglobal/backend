import { IsNotEmpty, IsString } from 'class-validator';

export class PhoneDto {
  @IsNotEmpty()
  @IsString()
  phone: string;
}
