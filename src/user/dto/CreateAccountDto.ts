import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({
    example: '22222222222',
    description: 'Bank Verification Number (BVN)',
    required: true,
    minLength: 11,
    maxLength: 11,
    pattern: '^[0-9]{11}$'
  })
  @IsNotEmpty()
  @IsString()
  bvn: string;
}
