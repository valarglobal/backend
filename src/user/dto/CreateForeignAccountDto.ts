import { CURRENCY } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateForeignAccountDto {
  @IsNotEmpty()
  @IsEnum(CURRENCY)
  currency: CURRENCY;
}
