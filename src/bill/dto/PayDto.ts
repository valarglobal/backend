import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayDto {
  @ApiProperty({
    example: 1000,
    description: 'Amount to be paid',
    required: true
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 101,
    description: 'Unique identifier for the operator/service provider',
    required: true
  })
  @IsNotEmpty()
  @IsNumber()
  operatorId: number;

  @ApiProperty({
    example: '+2348012345678',
    description: 'Phone number to receive the service',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'NGN',
    description: 'Currency for the transaction',
    required: true
  })
  @IsNotEmpty()
  @IsString()
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

  @ApiPropertyOptional({
    example: false,
    description: 'Whether to save recipient as beneficiary',
    default: false
  })
  @IsBoolean()
  @IsOptional()
  addBeneficiary: boolean = false;
}
