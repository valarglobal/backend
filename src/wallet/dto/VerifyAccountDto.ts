import { IsNotEmpty, IsOptional, IsString, Matches, Length } from 'class-validator';

export class VerifyAccountDto {
  @IsNotEmpty({ message: 'Account number is required' })
  @IsString({ message: 'Account number must be a string' })
  @Matches(/^[0-9]{10}$/, {
    message: 'Account number must be exactly 10 digits',
  })
  accountNumber: string;

  @IsOptional()
  @IsString({ message: 'Bank code must be a string' })
  @Length(3, 10, {
    message: 'Bank code must be between 3 and 10 characters',
  })
  bankCode?: string;
}
