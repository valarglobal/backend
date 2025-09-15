import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ContactUsDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 100, { message: 'Full name must be between 2 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  fullname: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9+\-()\s]*$/, {
    message: 'Phone number contains invalid characters',
  })
  @Length(7, 20, { message: 'Phone number must be 7–20 characters long' })
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @IsNotEmpty()
  @IsString()
  @Length(3, 100, { message: 'Title must be between 3 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsNotEmpty()
  @IsString()
  @Length(10, 1000, {
    message: 'Message must be between 10 and 1000 characters',
  })
  @Transform(({ value }) => value?.trim())
  message: string;
}
