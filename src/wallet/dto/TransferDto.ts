import { CURRENCY } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class TransferDto {
  @IsOptional()
  @IsString({ message: 'Account name must be a string' })
  @MaxLength(100, { message: 'Account name cannot exceed 100 characters' })
  accountName: string;

  @IsNotEmpty({ message: 'Bank code is required' })
  @IsString({ message: 'Bank code must be a string' })
  @Length(3, 10, { message: 'Bank code must be between 3 and 10 characters' })
  bankCode: string;

  @IsNotEmpty({ message: 'Account number is required' })
  @IsString({ message: 'Account number must be a string' })
  @Matches(/^[0-9]{10}$/, {
    message: 'Account number must be exactly 10 digits',
  })
  accountNumber: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a valid number' })
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount: number;

  @IsNotEmpty({ message: 'Currency is required' })
  @IsEnum(CURRENCY, {
    message: `Currency must be a valid value of CURRENCY enum`,
  })
  currency: CURRENCY;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description: string;

  @IsOptional()
  @IsNumber({}, { message: 'Fee must be a valid number' })
  @IsPositive({ message: 'Fee must be greater than 0' })
  fee: number;

  @IsOptional()
  @IsString({ message: 'Session ID must be a string' })
  @MaxLength(50, { message: 'Session ID cannot exceed 50 characters' })
  sessionId: string;

  @IsNotEmpty({ message: 'Wallet PIN is required' })
  @IsString({ message: 'Wallet PIN must be a string' })
  @Matches(/^[0-9]{4,6}$/, {
    message: 'Wallet PIN must be 4 to 6 digits only',
  })
  walletPin: string;

  @IsOptional()
  @IsString({ message: 'Debit subaccount ID must be a string' })
  @MaxLength(50, {
    message: 'Debit subaccount ID cannot exceed 50 characters',
  })
  debitSubaccountId: string;

  @IsOptional()
  @IsBoolean({ message: 'Add beneficiary must be a boolean value' })
  addBeneficiary: boolean = false;
}
