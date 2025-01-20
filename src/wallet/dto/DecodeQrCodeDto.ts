import { IsNotEmpty, IsString } from 'class-validator';

export class DecodeQrCodeDto {
  @IsNotEmpty()
  @IsString()
  qrCode: string;
}
