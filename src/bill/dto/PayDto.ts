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

export class PayDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  operatorId: number;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{8,15}$/, {
    message: 'Phone number must be 8–15 digits long',
  })
  phone: string;

  @IsNotEmpty()
  @IsEnum(CURRENCY, { message: 'Invalid currency code' })
  currency: CURRENCY;

  @IsNotEmpty()
  @IsString()
  @Length(4, 6, { message: 'Wallet PIN must be 4–6 digits long' })
  @Matches(/^[0-9]+$/, { message: 'Wallet PIN must contain only numbers' })
  walletPin: string;

  @IsOptional()
  @IsBoolean()
  addBeneficiary?: boolean;
}
