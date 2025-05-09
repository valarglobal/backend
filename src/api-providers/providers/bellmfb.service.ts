import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface IndividualClientPayload {
  firstname: string;
  lastname: string;
  middlename?: string;
  phoneNumber: string;
  address: string;
  bvn: number;
  gender: 'male' | 'female';
  dateOfBirth: string; // format: YYYY/MM/DD (e.g., 1993/12/29)
  metadata?: Record<string, any>;
  emailAddress?: string;
}

interface IndividualClientResponse {
  success: boolean;
  data: {
    metadata: Record<string, any>;
    createdAt: number;
    updatedAt: number;
    id: number;
    accountNumber: string;
    accountName: string;
    accountType: string;
    firstname: string;
    lastname: string;
    middlename: string;
    mobileNumber: string;
    externalReference: string;
    emailAddress: string;
    bvn: string;
    gender: string;
    address: string;
    dateOfBirth: string;
    validityType: string;
  };
}

@Injectable()
export class BellAccountService {
  SANDBOX_BASE_URL = 'https://sandbox-baas-api.bellmfb.com';
  PRODUCTION_BASE_URL = 'https://baas-api.bellmfb.com';

  constructor(private readonly configService: ConfigService) { }

  async getAccessToken() {
    const url = this.SANDBOX_BASE_URL + '/v1/generate-token';

    const payload = {
      consumerKey: this.configService.get<string>('BELL_CONSUMER_KEY'),
      consumerSecret: this.configService.get<string>('BELL_CONSUMER_SECRET'),
      validityTime: this.configService.get<number>(
        'BELL_CONSUMER_VALIDITY_TIME',
      ),
    };

    const response = await axios.post(url, payload);

    if (response?.status !== 200)
      throw new InternalServerErrorException('Failed to generate token');

    const data = response?.data;

    return {
      accessToken: data?.token,
    };
  }

  private async getHeaders() {
    const tokenObj = await this.getAccessToken();

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenObj?.accessToken}`,
    };
  }

  async createIndividualClient(
    payload: IndividualClientPayload,
  ): Promise<IndividualClientResponse> {
    const url = this.SANDBOX_BASE_URL + '/v1/account/clients/individual';

    try {
      const response = await axios.post(url, payload, {
        headers: await this.getHeaders(),
      });

      if (response?.status !== 200) {
        throw new InternalServerErrorException(
          'Failed to create individual client account',
        );
      }

      return response.data;
    } catch (error) {
      console.error(
        'Error creating individual client account:',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        error.response?.data?.message ||
        'Failed to create individual client account',
      );
    }
  }
}
