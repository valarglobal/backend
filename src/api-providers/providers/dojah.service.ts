import {
  Injectable,
  InternalServerErrorException,
  Param,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DojahService {
  constructor(private readonly configService: ConfigService) {}

  async bvnLookUp(bvn: string) {
    const url =
      this.configService.get<string>('DOJAH_BASE_URL') + '/api/v1/kyc/bvn/full';

    const response = await axios.get(url, {
      headers: this.getHeaders(),
      params: {
        bvn,
      },
    });

    if (response.status !== 200) {
      throw new InternalServerErrorException('Failed to validate BVN');
    }

    return response.data;
  }

  async validateBvn(bvn: string) {
    const url =
      this.configService.get<string>('DOJAH_BASE_URL') + '/api/v1/kyc/bvn';

    const response = await axios.get(url, {
      headers: this.getHeaders(),
      params: {
        bvn,
      },
    });

    if (response.status !== 200) {
      throw new InternalServerErrorException('Failed to validate BVN');
    }

    return response.data;
  }

  async verifyNinWithSelfie(payload: { selfie_image: string; nin: string }) {
    const url =
      this.configService.get<string>('DOJAH_BASE_URL') +
      '/api/v1/kyc/nin/verify';

    const response = await axios.post(url, payload, {
      headers: this.getHeaders(),
    });

    if (response?.status !== 200)
      throw new InternalServerErrorException(
        'Failed to verify nin and face image',
      );

    return response?.data;
  }

  async verifyNin(payload: { nin: string }) {
    const url =
      this.configService.get<string>('DOJAH_BASE_URL') + '/api/v1/kyc/nin';

    const response = await axios.get(url, {
      headers: this.getHeaders(),
      params: payload,
    });

    if (response?.status !== 200)
      throw new InternalServerErrorException('Failed to get nin details');

    return response?.data;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: this.configService.get<string>('DOJAH_SECRET_KEY'),
      Appid: this.configService.get<string>('DOJAH_APPID'),
    };
  }
}
