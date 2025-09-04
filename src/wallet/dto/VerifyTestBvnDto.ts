import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyTestBvn  {
  @IsNotEmpty()
  @IsString()
  bvn: string;

  @IsOptional()
  @IsString()
  fullname?: string;


  @IsOptional()
  @IsString()
  phoneNumber?: string;


  @IsOptional()
  @IsString()
  dateOfBirth: string;





 
}