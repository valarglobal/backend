import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EditProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsOptional()
  phoneNumber: string;
}
