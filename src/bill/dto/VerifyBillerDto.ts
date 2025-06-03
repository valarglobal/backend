import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyBillerDto {
  @ApiProperty({
    example: 'DSTV-PREM',
    description: 'Unique code for the bill item',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  itemCode: string;

  @ApiProperty({
    example: 'DSTV',
    description: 'Code identifying the biller',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  billerCode: string;

  @ApiProperty({
    example: '1234567890',
    description: 'Customer number or identifier with the biller',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  billerNumber: string;
}
