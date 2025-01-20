import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ReloadlyService {
  private accessTokenCache: {
    accessToken: string;
    issueTime: Date;
    expireIn: number;
  };

  AIRTIME_BASE_URL = 'https://topups.reloadly.com';
  GIFT_CARD_BASE_URL = 'https://giftcards.reloadly.com';
  UTILITY_BASE_URL = 'https://utilities.reloadly.com';
  AUTH_URL_BASE_URL = 'https://auth.reloadly.com';

  constructor(private readonly configService: ConfigService) {}

  async getAccessToken(audience: string) {
    // check if we have a valid token that hasn't expired

    if (this.accessTokenCache) {
      const currentTime = new Date();

      const tokenAge =
        (currentTime.getTime() - this.accessTokenCache.issueTime.getTime()) /
        1000;

      if (tokenAge < this.accessTokenCache.expireIn) {
        return this.accessTokenCache;
      }
    }

    const url = this.AUTH_URL_BASE_URL + '/oauth/token';

    const payload = {
      audience,
      client_id: this.configService.get<string>('RELOADLY_CLIENT_ID'),
      client_secret: this.configService.get<string>('RELOADLY_SECRET_KEY'),
      grant_type: 'client_credentials',
    };

    const response = await axios.post(url, payload);

    if (response?.status !== 200)
      throw new InternalServerErrorException('Failed to get access token');

    const data = response?.data;

    if (data?.access_token && data?.expires_in) {
      this.accessTokenCache = {
        accessToken: data?.access_token,
        issueTime: new Date(),
        expireIn: data?.expires_in,
      };
    }

    return {
      accessToken: data?.access_token,
    };
  }

  async getOperator(operatorId: number) {
    const url = this.AIRTIME_BASE_URL + `/operators/${operatorId}`;

    const response = await axios.get(url, {
      headers: await this.getHeaders(this.AIRTIME_BASE_URL),
    });

    if (response?.status !== 200)
      throw new InternalServerErrorException('Failed to get operator');

    return response?.data;
  }

  async payTopup(payload: {
    amount: number;
    operatorId: number;
    recipientEmail: string;
    customIdentifier?: string;
    recipientPhone: {
      countryCode: string;
      number: string;
    };
  }) {
    const url = this.AIRTIME_BASE_URL + `/topups`;

    const response = await axios.post(url, payload, {
      headers: await this.getHeaders(this.AIRTIME_BASE_URL),
    });

    if (response?.status !== 200)
      throw new InternalServerErrorException(
        'Failed to purchase airtime or data',
      );

    return response?.data;
  }

  async orderGiftCard(payload: {
    customIdentifier: string;
    productId: number;
    quantity: number;
    recipientEmail: string;
    senderName: string;
    unitPrice: number;
  }) {
    const url = this.GIFT_CARD_BASE_URL + '/orders';

    let response: any;
    try {
      response = await axios.post(url, payload, {
        headers: await this.getHeaders(this.GIFT_CARD_BASE_URL),
      });
    } catch (error) {
      console.log('error purchasing giftcard', error);
      throw new InternalServerErrorException('Failed to purchase giftcard');
    }

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to purchase giftcard');

    return response?.data;
  }

  async getGiftCardCategories() {
    const url = this.GIFT_CARD_BASE_URL + '/product-categories';

    const response = await axios.get(url, {
      headers: await this.getHeaders(this.GIFT_CARD_BASE_URL),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException(
        'Failed to get gittcard categories',
      );

    return response?.data;
  }

  async getGiftCardProductByISOCode(countrycode: string) {
    const url = this.GIFT_CARD_BASE_URL + `/countries/${countrycode}/products`;

    const response = await axios.get(url, {
      headers: await this.getHeaders(this.GIFT_CARD_BASE_URL),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException(
        'Failed to get product by ISO code',
      );

    return response.data;
  }

  private async getHeaders(audience: string) {
    const tokenObj = await this.getAccessToken(audience);

    // console.log('access token', tokenObj?.accessToken);
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenObj?.accessToken}`,
    };
  }
}
