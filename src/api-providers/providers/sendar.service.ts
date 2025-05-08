import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SMSContact {
  number: string;
  body: string;
  sms_type: 'plain' | 'unicode';
}

interface SendSMSPayload {
  contact: SMSContact[];
}

interface SMSLogEntry {
  uid: string;
  number: string;
  status: string;
  created_at: string;
}

interface SendSMSResponse {
  status: string;
  sms_logs: SMSLogEntry[];
  message: string;
}

interface GetSMSResponse {
  // Define the structure based on the actual API response
  status: string;
  data: {
    uid: string;
    number: string;
    status: string;
    created_at: string;
    // Add other fields as per the actual API response
  };
}

@Injectable()
export class SendarSmsService {
  SENDAR_API_BASE_URL = 'https://sendar.io/api';

  constructor(private readonly configService: ConfigService) { }

  private getHeaders() {
    return {
      'Api-key': this.configService.get<string>('SENDAR_API_KEY'),
      'Content-Type': 'application/json',
    };
  }

  async sendSMS(payload: SendSMSPayload): Promise<SendSMSResponse> {
    const url = `${this.SENDAR_API_BASE_URL}/sms/send`;

    console.log('payload', { ...payload, wallet_type: "1", sender_id: 'ValarPay' });

    console.log('url', url);

    try {
      const response = await axios.post(url, { ...payload, wallet_type: 1, sender_id: 'ValarPay' }, {
        headers: this.getHeaders(),
      });

      if (response?.status !== 200) {
        throw new InternalServerErrorException('Failed to send SMS');
      }

      return response.data;
    } catch (error) {
      console.error(
        'Error sending SMS:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        error.response?.data?.message || 'Failed to send SMS',
      );
    }
  }

  async getSMS(uid: string): Promise<GetSMSResponse> {
    const url = `${this.SENDAR_API_BASE_URL}/get/sms/${uid}`;

    try {
      const response = await axios.get(url, {
        headers: this.getHeaders(),
      });

      if (response?.status !== 200) {
        throw new InternalServerErrorException(
          'Failed to retrieve SMS information',
        );
      }

      return response.data;
    } catch (error) {
      console.error(
        'Error retrieving SMS information:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        error.response?.data?.message || 'Failed to retrieve SMS information',
      );
    }
  }
}
