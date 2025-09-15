import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EditProfileDto {
  @IsString({ message: 'Full name must be a string' })
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @IsString({ message: 'Phone number must be a string' })
  @IsOptional()
  phoneNumber: string;
}
