import { CURRENCY } from '@prisma/client';
import {
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
}
