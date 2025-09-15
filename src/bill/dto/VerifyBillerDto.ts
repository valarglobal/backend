import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyBillerDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 50, { message: 'Item code must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  itemCode: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 50, { message: 'Biller code must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  billerCode: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9A-Za-z]+$/, {
    message: 'Biller number must be alphanumeric',
  })
  @Length(5, 20, { message: 'Biller number must be 5–20 characters long' })
  @Transform(({ value }) => value?.trim())
  billerNumber: string;
}
