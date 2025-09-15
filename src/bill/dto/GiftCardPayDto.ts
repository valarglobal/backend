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

export class GiftCardPayDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Product ID must be a positive number' })
  productId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Unit price must be greater than 0' })
  unitPrice: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsOptional()
  @IsEnum(CURRENCY, { message: 'Invalid currency code' })
  currency?: CURRENCY;

  @IsNotEmpty()
  @IsString()
  @Length(4, 6, { message: 'Wallet PIN must be 4–6 characters long' })
  @Matches(/^[0-9]+$/, { message: 'Wallet PIN must contain only digits' })
  walletPin: string;

  @IsOptional()
  @IsBoolean()
  addBeneficiary?: boolean;
}
