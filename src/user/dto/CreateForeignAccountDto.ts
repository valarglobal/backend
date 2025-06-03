import { CURRENCY } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateForeignAccountDto {
  @ApiProperty({
    example: CURRENCY.USD,
    description: 'Currency for the foreign account',
    required: true,
    enum: CURRENCY,
    enumName: 'Currency',
    examples: [CURRENCY.USD, CURRENCY.EUR, CURRENCY.GBP]
  })
  @IsNotEmpty()
  @IsEnum(CURRENCY)
  currency: CURRENCY;
}
