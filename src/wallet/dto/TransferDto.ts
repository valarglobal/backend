import { CURRENCY } from '@prisma/client';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class TransferDto {
  @IsString()
  @IsOptional()
  accountName: string;

  @IsNotEmpty()
  @IsString()
  bankCode: string;

  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: CURRENCY;

  @IsOptional()
  @IsString()
  description: string;

  @IsNumber()
  @IsOptional()
  fee: number;

  @IsOptional()
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  walletPin: string;

  @IsOptional()
  @IsString()
  biometricKey: string;

  @IsOptional()
  @IsString()
  debitSubaccountId: string;

  @IsBoolean()
  @IsOptional()
  addBeneficiary: boolean = false;
}
