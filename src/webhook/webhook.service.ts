import { Injectable } from '@nestjs/common';
import { FlutterwaveService } from 'src/api-providers/providers/flutterwave.service';
import { SafeHavenService } from 'src/api-providers/providers/safe-haven.service';
import { VFDBankService } from 'src/api-providers/providers/VFDBank.service';

@Injectable()
export class WebhookService {
  constructor(
    private readonly flutterwaveService: FlutterwaveService,
    private readonly VFDBankService: VFDBankService,
    private readonly safeHavenService: SafeHavenService,
  ) {}

  async resolveFlutterwaveWebhook(body: any) {
    const event = body?.event;
    const data: any = body?.data;

    switch (event) {
      case 'charge.completed':
        if (data?.status === 'successful') {
          this.flutterwaveService.handlePaymentSuccess(body);
        } else if (data?.status === 'failed') {
          this.flutterwaveService.handlePaymentFailure(body);
        }
        break;
      case 'transfer.completed':
        if (data?.status === 'SUCCESSFUL') {
          this.flutterwaveService.handleTransferSuccess(body);
        } else if (data?.status === 'FAILED') {
          this.flutterwaveService.handleTransferFailure(body);
        }
        break;
      default:
        console.log('no webhook event found');
    }
  }

  async resolveVFDWebhook(body: any) {
    this.VFDBankService.handlePaymentSuccess(body);
  }

  async resolveSafeHavenWebhook(body: any) {
    switch (body?.type) {
      case 'transfer':
        this.safeHavenService.handleTransferWebhook(body);
        break;
      default:
        console.log('no webhook event found');
    }
  }
}
