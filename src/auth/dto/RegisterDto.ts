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

export class RegisterDto {
  @ApiProperty({
    example: 'johndoe',
    description: 'Unique username for the account'
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the user'
  })
  @IsNotEmpty()
  @IsString()
  fullname: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
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
    example: false,
    description: 'Whether the account is for a registered business'
  })
  @IsOptional()
  @IsBoolean()
  isBusinessRegistered?: boolean;

  @ApiPropertyOptional({
    example: ACCOUNT_TYPE.PERSONAL,
    description: 'Type of account',
    enum: ACCOUNT_TYPE,
    default: ACCOUNT_TYPE.PERSONAL
  })
  @IsOptional()
  @IsEnum(ACCOUNT_TYPE)
  accountType?: ACCOUNT_TYPE = ACCOUNT_TYPE.PERSONAL;
}
