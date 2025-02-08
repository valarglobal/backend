import { IsNotEmpty, IsString } from 'class-validator';

export class KycTier3Dto {
  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @IsString()
  address: string;
}
