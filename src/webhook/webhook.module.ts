import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ApiProvidersModule } from 'src/api-providers/api-providers.module';

@Module({
  imports: [ApiProvidersModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
