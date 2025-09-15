import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class AddCablPlanDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  planName: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a valid ISO 4217 code (e.g., NGN, USD, GBP)',
  })
  currency: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  billerCode: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  shortName: string;
}
