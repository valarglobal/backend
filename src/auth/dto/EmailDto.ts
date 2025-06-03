import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    required: true,
    format: 'email'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
