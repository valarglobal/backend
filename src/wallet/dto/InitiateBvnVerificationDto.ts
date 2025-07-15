import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitiateBvnVerificationDto {
  @IsNotEmpty()
  @IsString()
  bvn: string;

  @IsOptional()
  @IsString()
  fullname?: string;

 
}
