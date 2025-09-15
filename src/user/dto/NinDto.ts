import { IsNotEmpty, IsString } from 'class-validator';

export class NinDto {
  @IsString({ message: 'NIN must be a string' })
  @IsNotEmpty({ message: 'NIN is required' })
  nin: string;
}
