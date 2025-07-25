import { CURRENCY } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayBillDto {
  @ApiProperty({
    example: 'DSTV-PREM',
    description: 'Unique code for the bill item',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  itemCode: string;

  @ApiProperty({
    example: 'DSTV',
    description: 'Code identifying the biller',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  billerCode: string;

  @ApiProperty({
    example: 'NGN',
    description: 'Currency for the transaction',
    enum: CURRENCY,
    required: true
  })
  @IsString()
  @IsEnum(CURRENCY)
  currency: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Customer number or identifier with the biller'
  })
  @IsNotEmpty()
  @IsOptional()
  billerNumber: string;


  @IsOptional()
  @IsNumber()
  fee: number;



  @IsOptional()
  @IsNumber()
  netAmount: number;

  @ApiProperty({
    example: 5000,
    description: 'Amount to pay for the bill',
    required: true
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: '123456',
    description: 'Wallet PIN for authorization',
    required: true,
    format: 'password'
  })
  @IsNotEmpty()
  @IsString()
  walletPin: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether to save biller as beneficiary',
    default: false
  })
  @IsBoolean()
  @IsOptional()
  addBeneficiary: boolean = false;
}
