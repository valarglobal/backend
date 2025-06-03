import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasscodeDto {
  @ApiProperty({
    example: '123456',
    description: 'Current six-digit passcode',
    required: true,
    minLength: 6,
    maxLength: 6,
    pattern: '^[0-9]+$'
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^[0-9]+$/, { message: 'Passcode must contain only numbers' })
  oldPasscode: string;

  @ApiProperty({
    example: '654321',
    description: 'New six-digit passcode',
    required: true,
    minLength: 6,
    maxLength: 6,
    pattern: '^[0-9]+$'
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'Passcode must be exactly 6 digits' })
  @Matches(/^[0-9]+$/, { message: 'Passcode must contain only numbers' })
  newPasscode: string;
}
