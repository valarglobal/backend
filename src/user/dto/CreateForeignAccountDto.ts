import { CURRENCY } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateForeignAccountDto {
  @IsNotEmpty({ message: 'Currency is required' })
  @IsEnum(CURRENCY, { message: 'Currency must be a valid enum value' })
  currency: CURRENCY;
}
