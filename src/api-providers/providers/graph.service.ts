import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CURRENCY } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class GraphService {
  constructor(private readonly configService: ConfigService) {}

  async createAccount(
    infoData: {
      name_first: string;
      name_last: string;
      name_other: string;
      phone: string;
      email: string;
      dob: string;
    },
    countryCode: string,
    currency: CURRENCY,
  ) {
    const url =
      this.configService.get<string>('GRAPH_BASE_URL') + '/bank_account';

    let person: any;
    try {
      // person = await this.createPerson(infoData, countryCode);
    } catch (error) {
      console.log('error creating person', error);
      throw new InternalServerErrorException(
        `Failed to create ${currency} account`,
      );
    }

    const payload = {
      person_id: 'ab9d492f013911f0b8d20edcd86e5ab3',
      currency,
      label: `${infoData.name_first} ${infoData.name_last}`,
      autosweep_enabled: true,
    };

    const response = await axios.post(url, payload, {
      headers: this.getHeaders(),
    });

    if (response.status !== 201) {
      throw new InternalServerErrorException(
        `Failed to create ${currency} account`,
      );
    }

    return response?.data?.data;
  }

  private async createPerson(
    payload: {
      name_first: string;
      name_last: string;
      name_other: string;
      phone: string;
      email: string;
      dob: string;
    },
    countryCode: string,
  ) {
    const url = this.configService.get<string>('GRAPH_BASE_URL') + '/person';
    // convert dob format from 21-Apr-2001 to 2001-04-21
    const newDob = new Date(payload.dob).toISOString().split('T')[0];
    console.log('new date of birth', newDob);

    const requestBody = {
      ...payload,
      dob: newDob,
      id_country: countryCode,
      id_type: 'nin',
      id_number: '80471012392',
      bank_id_number: '22569404141',
      address: {
        line1: 'Hope Alive off new Lagos Road',
        city: 'Benin City',
        state: 'Edo State',
        country: 'NG',
        postal_code: '300001',
      },
    };

    const response = await axios.post(url, requestBody, {
      headers: this.getHeaders(),
    });

    if (response.status !== 201) {
      throw new InternalServerErrorException('Failed to create person');
    }

    return response?.data?.data;
  }

  private getHeaders() {
    const secretKey = this.configService.get<String>('GRAPH_API_KEY');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    };
  }
}
