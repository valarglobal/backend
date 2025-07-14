import { IsBase64, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import internal from 'stream';

export class VerifyAccountDto {
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsString()
  bankCode: string;

  @IsNotEmpty()
  @IsBoolean()
  internal: boolean;


}
