import { NETWORK } from '@prisma/client';
import { 
  IsEnum, 
  IsNotEmpty, 
  IsNumber, 
  IsString, 
  MaxLength, 
  Matches, 
  IsInt 
} from 'class-validator';
import { Transform } from 'class-transformer';

export class AddPlanDto {
  @IsNotEmpty()
  @IsEnum(NETWORK, { message: 'Network must be a valid NETWORK enum value' })
  network: NETWORK;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  planName: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a valid ISO 4217 code (e.g., NGN, USD)',
  })
  currency: string;

  @IsNotEmpty()
  @IsNumber()
  @IsInt({ message: 'Operator ID must be an integer' })
  operatorId: number;
}
