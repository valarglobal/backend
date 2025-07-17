import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreatePushTokenDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsString()
  @IsIn(['ios', 'android', 'web'])
  platform: string;
}




export class RemovePushTokenDto {
  @IsString()
  token: string;
}