import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class InitiateBvnVerificationDto {
  @IsString({ message: 'BVN must be a string' })
  @IsNotEmpty({ message: 'BVN is required' })
  @Length(11, 11, { message: 'BVN must be exactly 11 digits' })
  @Matches(/^[0-9]+$/, { message: 'BVN must contain only numbers' })
  bvn: string;
}
