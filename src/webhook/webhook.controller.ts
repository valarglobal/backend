import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('v1/webhook')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post('flutterwave')
  async flutterwaveWebhookHanlder(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const secretHash = this.configService.get<string>(
      'FLUTTERWAVE_SECRET_HASH',
    );

    const signature = req.headers['verif-hash'];

    if (!signature || signature !== secretHash) {
      return res.status(401).end();
    }

    await this.webhookService.resolveFlutterwaveWebhook(body);
    return res.status(200).end();
  }

  @Post('VFD/payment')
  async VFDWebhookHanlder(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const secretHash = this.configService.get<string>('VFD_SECRET_HASH');

    const secretHashFromRequest = req.headers['secret-hash'];

    if (secretHashFromRequest !== secretHash) return res.status(401).end();

    await this.webhookService.resolveVFDWebhook(body);
    return res.status(200).end();
  }

  @Post('safehaven')
  async safeHavenHandler(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.webhookService.resolveSafeHavenWebhook(body);
    return res.status(200).end();
  }

  @Post('bellmfb')
  async bellMFBHandler(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.webhookService.resolveBellMFBWebhook(body);
    return res.status(200).end();
  }
}
