import { IsNotEmpty, IsString } from 'class-validator';

export class KycTier3Dto {
  @IsNotEmpty()
  @IsString()
  address: string;
}
