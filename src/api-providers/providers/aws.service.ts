import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MessageType,
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';

@Injectable()
export class AwsService {
  private client: PinpointSMSVoiceV2Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new PinpointSMSVoiceV2Client({
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
      region: this.configService.get('AWS_REGION'),
    });
  }

  async sendSms(data: { phoneNumber: string; message: string }) {
    const command = new SendTextMessageCommand({
      DestinationPhoneNumber: data.phoneNumber,
      MessageBody: data.message,
      MessageType: MessageType.TRANSACTIONAL,
      TimeToLive: 600,
      OriginationIdentity: 'P2G',
    });

    try {
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }
}
