import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class BiometricRegistrationDto {
    @ApiProperty()
    @IsNotEmpty({ message: 'Email is required' })
    @IsString()
    email: string;
  
    @ApiProperty()
    @IsNotEmpty({ message: 'Key is required' })
    @IsString()
    key: string;
  }