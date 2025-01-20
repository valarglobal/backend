import { IsNotEmpty, IsString } from 'class-validator';

export class ReportScamDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;
}
