import { IsNotEmpty, IsString } from 'class-validator';

export class InitiateBvnVerificationDto {
  @IsNotEmpty()
  @IsString()
  bvn: string;
}
