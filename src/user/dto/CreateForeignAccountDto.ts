import { IsNotEmpty, IsString } from 'class-validator';

export class CreateForeignAccountDto {
  @IsNotEmpty()
  @IsString()
  currency: string;
}
