import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyBillerDto {
  @IsNotEmpty()
  @IsString()
  itemCode: string;

  @IsNotEmpty()
  @IsString()
  billerCode: string;

  @IsNotEmpty()
  @IsString()
  billerNumber: string;
}
