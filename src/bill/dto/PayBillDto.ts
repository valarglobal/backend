import { CURRENCY } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class PayBillDto {
  @IsNotEmpty()
  @IsString()
  itemCode: string;

  @IsNotEmpty()
  @IsString()
  billerCode: string;

  @IsNotEmpty()
  @IsEnum(CURRENCY, { message: 'Invalid currency code' })
  currency: CURRENCY;

  @IsOptional()
  @IsString()
  billerNumber?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsNotEmpty()
  @IsString()
  @Length(4, 6, { message: 'Wallet PIN must be 4–6 digits long' })
  @Matches(/^[0-9]+$/, { message: 'Wallet PIN must contain only numbers' })
  walletPin: string;

  @IsOptional()
  @IsBoolean()
  addBeneficiary?: boolean;
}
