import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

export interface SmileIdBasicKycPayload {
  middle_name?: string;
  bvn: string;
  id_type: string;
  gender?: string;
}

@Injectable()
export class SmileIdService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private generateSignature(timestamp: string): string {
    const apiKey = this.configService.get<string>('SMILE_ID_API_KEY');
    const partnerId = this.configService.get<string>('SMILE_ID_PARTNER_ID');

    const message = `${partnerId}${timestamp}`;
    return crypto.createHmac('sha256', apiKey).update(message).digest('hex');
  }

  async verifyBasicKyc(userId: string, payload: SmileIdBasicKycPayload) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    try {
      const timestamp = new Date().toISOString();
      const partnerId = this.configService.get<string>('SMILE_ID_PARTNER_ID');
      const isProduction =
        this.configService.get<string>('NODE_ENV') === 'production';

      // const baseUrl = isProduction
      //   ? 'https://api.smileidentity.com/v2/verify'
      //   : 'https://testapi.smileidentity.com/v2/verify';

      const baseUrl = 'https://api.smileidentity.com/v2/verify';

      const requestBody = {
        source_sdk: 'rest_api',
        source_sdk_version: '1.0.0',
        partner_id: partnerId,
        signature: this.generateSignature(timestamp),
        timestamp,
        country: user.currency.slice(0, 2),
        id_type: payload.id_type,
        id_number: payload.bvn,
        first_name: user.fullname.split(' ')[0],
        middle_name: payload.middle_name || '',
        last_name: user.fullname.split(' ')[1],
        dob: user.dateOfBirth || '',
        gender: payload.gender || 'M',
        phone_number: user.phoneNumber || '',
        partner_params: {
          user_id: user.id,
        },
        callback_url: 'https://localhost:3000/api/v1/callback',
      };

      console.log('requestBody', requestBody);

      const response = await axios.post(baseUrl, requestBody, {
        headers: this.getHeaders(),
      });

      console.log('response', response.data);
      return response.data;
    } catch (error) {
      console.log('Error verifying basic KYC with Smile ID', error);
      throw error;
    }
  }
}
