import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactUsDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the person sending the message',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  fullname: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address for contact',
    required: true,
    format: 'email'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: '+2348012345678',
    description: 'Contact phone number',
    pattern: '^\+[1-9]\d{1,14}$'
  })
  @IsOptional()
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'Account Inquiry',
    description: 'Subject or title of the message',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    example: 'I need assistance with my account verification...',
    description: 'The main content of the message',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
