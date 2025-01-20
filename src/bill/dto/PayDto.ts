import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PayDto {
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsNumber()
  operatorId: number;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  currency: string;
}
