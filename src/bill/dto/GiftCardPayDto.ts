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

export class GiftCardPayDto {
  @ApiProperty({
    example: 1234,
    description: 'ID of the gift card product',
    required: true
  })
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @ApiProperty({
    example: 2,
    description: 'Number of gift cards to purchase',
    required: true,
    minimum: 1
  })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiProperty({
    example: 50.00,
    description: 'Price per gift card',
    required: true
  })
  @IsNotEmpty()
  @IsNumber()
  unitPrice: number;

  @ApiProperty({
    example: 100.00,
    description: 'Total amount for the purchase',
    required: true
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    example: 'NGN',
    description: 'Currency for the transaction',
    enum: CURRENCY,
    default: 'NGN'
  })
  @IsOptional()
  @IsEnum(CURRENCY)
  currency: string;

  @ApiProperty({
    example: '123456',
    description: 'Wallet PIN for authorization',
    required: true,
    format: 'password'
  })
  @IsNotEmpty()
  @IsString()
  walletPin: string;

    
  @IsOptional()
  @IsNumber()
  fee: number;

  @ApiProperty({
    example: '123456',
    description: 'Wallet PIN for authorization',
    required: true,
    format: 'password'
  })
  @IsOptional()
  @IsString()
  biometricKey: string;
  @ApiPropertyOptional({
    example: false,
    description: 'Whether to save recipient as beneficiary',
    default: false
  })
  @IsBoolean()
  @IsOptional()
  addBeneficiary: boolean = false;
}
