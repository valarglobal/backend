import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyAccountDto {
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @IsOptional()
  @IsString()
  bankCode: string;
}
