import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBusinessAccountDto {
  @IsNotEmpty()
  @IsString()
  rcNumber: string;

  @IsNotEmpty()
  @IsString()
  companyName: string;

  @IsNotEmpty()
  @IsString()
  incorporationDate: string;

  @IsNotEmpty()
  @IsString()
  bvn: string;
}
