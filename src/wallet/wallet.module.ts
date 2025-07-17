import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ApiProvidersModule } from 'src/api-providers/api-providers.module';
import { EmailModule } from 'src/email/email.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [PrismaModule, ApiProvidersModule, NotificationsModule, EmailModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
