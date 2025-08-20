import { IsString, IsOptional, IsIn, IsEnum } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  title: string;


  @IsString()
  message: string;

  @IsEnum(['TRANSACTION', 'UPDATES', 'MESSAGES', '  SERVICES '])
  category: 'TRANSACTION' | 'UPDATES' | 'MESSAGES' | 'SERVICES';


}