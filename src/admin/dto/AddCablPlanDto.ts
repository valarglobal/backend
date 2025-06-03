import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddCablPlanDto {
  @ApiProperty({
    example: 'DSTV Premium',
    description: 'Name of the cable plan',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  planName: string;

  @ApiProperty({
    example: 'NGN',
    description: 'Currency code for the plan',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty({
    example: 'DSTV-PREM',
    description: 'Unique biller code for the plan',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  billerCode: string;

  @ApiProperty({
    example: 'DSTV Premium subscription plan with all channels',
    description: 'Detailed description of the cable plan',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    example: 'DSTV-P',
    description: 'Short identifier for the plan',
    required: true
  })
  @IsNotEmpty()
  @IsString()
  shortName: string;
}
