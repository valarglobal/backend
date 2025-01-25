import { CURRENCY } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class PayBillDto {
  @IsNotEmpty()
  @IsString()
  itemCode: string;

  @IsNotEmpty()
  @IsString()
  billerCode: string;

  @IsString()
  @IsEnum(CURRENCY)
  currency: string;

  @IsNotEmpty()
  @IsOptional()
  billerNumber: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  walletPin: string;

  @IsBoolean()
  @IsOptional()
  addBeneficiary: boolean = false;
}
