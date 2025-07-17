import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  UseGuards, 
  Request, 
  Req 
} from '@nestjs/common';

import { PushTokenService } from './push-token.service';
import { CreatePushTokenDto, RemovePushTokenDto } from './dto/PushTokenDto';


@Controller('v1/notifications')

export class NotificationsController {
  constructor(private pushTokenService: PushTokenService) {}

  @Post("push-token")
  async registerPushToken(
    @Request() req,
    @Body() createPushTokenDto: CreatePushTokenDto,
  ) {
      const user = req['user'];
    return this.pushTokenService.savePushToken(user, createPushTokenDto);
  }

  @Delete()
  async removePushToken(
    @Request() req,
    @Body() removePushTokenDto: RemovePushTokenDto,
  ) {
    const user = req['user'];
    return this.pushTokenService.removePushToken(user, removePushTokenDto);
  }
}
