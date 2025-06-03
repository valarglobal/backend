import { NETWORK } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddPlanDto {
  @ApiProperty({
    enum: NETWORK,
    example: NETWORK.mtn,
    description: 'Network provider (MTN, AIRTEL, GLO, 9MOBILE)',
    required: true
  })
  @IsNotEmpty()
  @IsEnum(NETWORK)
  network: NETWORK;

  @ApiProperty({
    example: '1GB Monthly Plan',
    description: 'Name of the data plan',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  planName: string;

  @ApiProperty({
    example: 'NGN',
    description: 'Currency code for the plan',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({
    example: 1001,
    description: 'Unique operator identifier for the plan',
    required: true
  })
  @IsNotEmpty()
  @IsNumber()
  operatorId: number;
}
