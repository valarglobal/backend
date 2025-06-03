import { ACCOUNT_TYPE, CURRENCY } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterBusinessDto {
  @ApiProperty({
    example: 'techbusiness',
    description: 'Unique username for the business account'
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    example: 'Tech Solutions Ltd',
    description: 'Full registered name of the business'
  })
  @IsNotEmpty()
  @IsString()
  fullname: string;

  @ApiProperty({
    example: 'business@example.com',
    description: 'Business email address',
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '15-Mar-1990',
    description: 'Date of birth in DD-MMM-YYYY format',
    pattern: '^(0?[1-9]|[12][0-9]|3[01])-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\\d{4}$'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(
    /^(0?[1-9]|[12][0-9]|3[01])-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}$/,
    {
      message: 'Date of birth must be in format: DD-MMM-YYYY (e.g., 8-Mar-1995)',
    },
  )
  dateOfBirth: string;

  @ApiProperty({
    example: 'RC123456',
    description: 'Company registration number'
  })
  @IsNotEmpty()
  @IsString()
  companyRegistrationNumber: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Account password',
    format: 'password'
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({
    example: 'NGN',
    description: 'Country code',
    enum: CURRENCY
  })
  @IsOptional()
  @IsString()
  @IsEnum(CURRENCY)
  countryCode?: string;

  @ApiPropertyOptional({
    example: 'REF123',
    description: 'Referral code if any'
  })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional({
    example: 'NGN',
    description: 'Preferred currency',
    enum: CURRENCY
  })
  @IsOptional()
  @IsString()
  @IsEnum(CURRENCY)
  currency?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the business is officially registered'
  })
  @IsOptional()
  @IsBoolean()
  isBusinessRegistered?: boolean;

  @ApiPropertyOptional({
    example: ACCOUNT_TYPE.BUSINESS,
    description: 'Type of account',
    enum: ACCOUNT_TYPE,
    default: ACCOUNT_TYPE.BUSINESS
  })
  @IsOptional()
  @IsEnum(ACCOUNT_TYPE)
  accountType?: ACCOUNT_TYPE = ACCOUNT_TYPE.BUSINESS;
}
