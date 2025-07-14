import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface IndividualClientPayload {
  firstname: string;
  lastname: string;
  middlename?: string;
  phoneNumber: string;
  address: string;
  bvn: string;
  gender: 'male' | 'female';
  dateOfBirth: string; // format: YYYY/MM/DD (e.g., 1993/12/29)
  metadata?: Record<string, any>;
  emailAddress?: string;
}


interface CorporateClientPayload {
  rcNumber: string,
  businessName: string,
  emailAddress: string,
  bvn:string,
incoporationDate:string,
  phoneNumber: string,
  address?: string,
  metadata?: Record<string, any>;
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

interface CorporateClientResponse {

  "success": true,
  "data": {
      "metadata": {},
      "createdAt": number,
      "updatedAt": number,
      "id": number,
      "businessName": string,
      "accountNumber": string,
      "accountName": string,
      "accountType": string,
      "rcNumber": string,
      "incorporationDate": string,
      "mobileNumber": string,
      "externalReference": string,
      "emailAddress": string,
      "bvn": string,
      "dateOfBirth": string,
      "address":string,
      "validityType":string
  }
}


@Injectable()
export class BellAccountService {
  SANDBOX_BASE_URL = 'https://sandbox-baas-api.bellmfb.com';
  PRODUCTION_BASE_URL = 'https://baas-api.bellmfb.com';

  constructor(private readonly configService: ConfigService) { }

  async getAccessToken() {
    const url = this.PRODUCTION_BASE_URL + '/v1/generate-token';

    const headers = {
      'Content-Type': 'application/json',
      consumerKey: this.configService.get<string>('BELL_CONSUMER_KEY'),
      consumerSecret: this.configService.get<string>('BELL_CONSUMER_SECRET'),
      validityTime: this.configService.get<number>('BELL_CONSUMER_VALIDITY_TIME'),
    };

    console.log('headers', headers);
    try {

      const response = await axios.post(url, {}, { headers });

      if (response?.status !== 200)
        throw new InternalServerErrorException('Failed to generate token');

      const data = response?.data;
      console.log('token data', data);

      return {
        accessToken: data?.token,
      };
    } catch (error) {
      console.log('error', error);
      throw new InternalServerErrorException('Failed to generate token');
    }
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
    const url = this.PRODUCTION_BASE_URL+ '/v1/account/clients/individual';

    console.log('payload', payload);

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
        error.response?.data || error?.message,
      );
      throw new InternalServerErrorException(
        error.response?.data?.message ||
        'Failed to create individual client account',
      );
    }
  }


  async createCoporateClient(
    payload: CorporateClientPayload,
  ): Promise<CorporateClientResponse> {
    const url = this.PRODUCTION_BASE_URL + '/v1/account/clients/corporate';

    // console.log('payload', payload);

    try {
      const response = await axios.post(url, payload, {
        headers: await this.getHeaders(),
      });

      if (response?.status !== 200) {
        throw new InternalServerErrorException(
          'Failed to create corporate client account',
        );
      }

      return response.data;
    } catch (error) {
      console.error(
        'Error creating corporate client account:',
        error.response?.data || error?.message,
      );
      throw new InternalServerErrorException(
        error.response?.data?.message ||
        'Failed to create corporate client account',
      );
    }
  }


  async getNameEquiry(bankCode: string, accountNumber: string) {
    const url = this.PRODUCTION_BASE_URL+ '/v1/transfer/name-enquiry';



    let response: any;
    try {
      response = await axios.post(
        url,
        {
          bankCode,
          accountNumber,
        },

        {
          headers: await this.getHeaders(),
        }
        
      );
    } catch (error) {
      throw error;
    }

    if (response.data.success !== true  ) {
      throw new InternalServerErrorException('Failed to get name enquiry');
    }

    return response?.data;
  }


 


  async getNameEquiryInternal( accountNumber: string) {
    const url = this.PRODUCTION_BASE_URL + `/v1/account/client-enquiry/${accountNumber}`;


    let response: any;
    try {
      response = await axios.get(
        url,
        {
          headers: await this.getHeaders(),
        } 
      );

      // console.log('response from getNameEquiryInternal', response)
    } catch (error) {
      throw error;
    }

    if (response.data.success !== true  ) {
      throw new InternalServerErrorException('Failed to get name enquiry');
    }
    return response?.data;
  }



  async getAllBanks() {
    const url = this.PRODUCTION_BASE_URL + '/v1/transfer/banks';

 

    const response = await axios.get(url, {
      headers: await this.getHeaders(),
    });


    // console.log('response from getAllBanks', response?.data);

    if (response.data.success !== true  ) {
      throw new InternalServerErrorException('Failed to get banks');
    }

    return response?.data;
  }



  async transerFund(payload: {
    beneficiaryBankCode: string;
    beneficiaryAccountNumber: string;
    amount: number;
    narration: string;
    reference?: string;
    senderName?:string
  
  }) {
 
    const url = this.PRODUCTION_BASE_URL  + '/v1/transfer';

  

    // console.log('payload for transfer', payload);
    let response: any;
    try {
      response = await axios.post(url, payload, {
        headers: await this.getHeaders(),
      });
    } catch (error) {
      // console.log('error transfering', error);
      throw error;
    }

    // console.log('response from transfer', response?.data);
    if (response.data.success !== true ) {
      throw new InternalServerErrorException('Failed to transfer fund');
    }

    return response?.data;
  }
}
