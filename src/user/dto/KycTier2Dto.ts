import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class KycTier2Dto {
  @IsNotEmpty()
  @IsString()
  @Length(11, 11, { message: 'NIN must be exactly 11 characters long.' })
  @Matches(/^\d+$/, { message: 'NIN must contain only numbers.' })
  nin: string;

  // @IsNotEmpty()
  // @IsString()
  // selfieImage: string;
}
