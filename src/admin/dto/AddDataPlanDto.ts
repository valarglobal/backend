import { NETWORK } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AddPlanDto {
  @IsNotEmpty()
  @IsEnum(NETWORK)
  network: NETWORK;

  @IsNotEmpty()
  @IsString()
  planName: string;

  @IsNotEmpty()
  @IsString()
  currency: string;

  @IsNotEmpty()
  @IsNumber()
  operatorId: number;
}
