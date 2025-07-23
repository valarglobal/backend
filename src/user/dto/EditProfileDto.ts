import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EditProfileDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  fullName: string;

  @IsString()
  @IsOptional()
  phoneNumber: string;
}
