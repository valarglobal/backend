import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBusinessAccountDto {
  @ApiProperty({
    example: 'RC123456',
    description: 'Company registration number issued by CAC',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  companyRegistrationNumber: string;

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
