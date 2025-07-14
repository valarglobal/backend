import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TermiiService {
  constructor(private readonly configService: ConfigService) {}

  async sendSms(data: { phoneNumber: string; message: string }) {
    const url =
      this.configService.get<string>('TERMII_BASE_URL') + '/api/sms/send';

    const payload = {
      api_key: this.configService.get<string>('TERMII_API_KEY'),
      to: data.phoneNumber,
      from: 'N-Alert',
      channel: 'dnd',
      sms: data.message,
    };

    const response = await axios.post(url, payload);

    if (response.status !== 200) {
      throw new InternalServerErrorException('Failed to send sms');
    }

    return response.data;
  }
}
