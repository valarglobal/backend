import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { PushTokenService } from './push-token.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PushNotificationService } from './notifications.service';


@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [NotificationsController, ],
  providers: [PushTokenService, PushNotificationService],
  exports: [PushNotificationService, PushTokenService],
})
export class NotificationsModule {}
