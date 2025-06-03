import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePinDto {
  @ApiProperty({
    example: '1234',
    description: 'Current four-digit PIN',
    required: true,
    minLength: 4,
    maxLength: 4,
    pattern: '^[0-9]{4}$'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{4}$/, {
    message: 'PIN must be exactly 4 digits',
  })
  oldPin: string;

  @ApiProperty({
    example: '5678',
    description: 'New four-digit PIN',
    required: true,
    minLength: 4,
    maxLength: 4,
    pattern: '^[0-9]{4}$'
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9]{4}$/, {
    message: 'PIN must be exactly 4 digits',
  })
  newPin: string;
}
