// iimport { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SendarResponse {
  success: boolean;
  message: string;
  data: Array<{
    id: number;
    created_at: string;
    status: 'pending' | 'schedule';
    message: {
      message: string;
    };
    contact: {
      sms_contact: string;
    };
  }>;
}

@Injectable()
export class SendarSmsService {
  constructor(private readonly configService: ConfigService) {}

  async sendSms(data: {
    phoneNumber: string;
    message: string;
    scheduleAt?: string;
  }) {
    const url = 'https://sendar.io/api/sms/send';

    const payload = {
      wallet_type : "Transactional",
      sender_id: "NattyPay",
      contact: [{
        number: Number(data.phoneNumber),
        body: data.message,
       
        ...(data.scheduleAt && { schedule_at: data.scheduleAt })
      }]
    };

    try {
      console.log('Sending SMS payload:', JSON.stringify(payload, null, 2));
      
      const response = await axios.post<SendarResponse>(url, payload, {
        headers: this.getHeaders(),
        validateStatus: (status) => status < 500,
      });

   

      return response.data;
    } catch (error) {
      console.error('Sendar API Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      throw new InternalServerErrorException(
        error.response?.data?.message || 'Failed to send SMS'
      );
    }
  }
  async sendSms2(data: {
    phoneNumber: string;
    message: string;
  }): Promise<SendarResponse> {
    const url = 'https://sendar.io/api/sms/send';
    
    // Construct query parameters
    // const params = new URLSearchParams({
    //   contacts: data.phoneNumber, // Single phone number as a string
    //   message: data.message,
    //   sms_type: 'plain',
    // });

    const encodedMessage = encodeURIComponent(data.message);
    const queryString = `contacts=${data.phoneNumber}&message=${encodedMessage}&sms_type=plain`;

    try {
      console.log('Sending SMS with query:', queryString);

      const response = await axios.get<SendarResponse>(`${url}?${queryString}`,{
        headers: this.getHeaders(),
        validateStatus: (status) => status < 500,
      }
       
      );



      return response.data;
    } catch (error) {
      console.error('SMS sending failed:', error.message);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  private getHeaders() {
    const apiKey = this.configService.get<string>('SENDAR_API_KEY');
    // console.log('SENDAR_API_KEY:', apiKey);
    if (!apiKey) {
      throw new Error('SENDAR_API_KEY not configured');
    }

    return {
      'Content-Type': 'application/json',
      'Api-key': apiKey
    };
  }
}