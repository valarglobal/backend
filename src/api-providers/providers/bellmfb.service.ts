import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TRANSACTION_TYPE, TRANSACTION_CATEGORY, TRANSACTION_STATUS } from '@prisma/client';
import axios from 'axios';
import { any, string } from 'joi';
import { async } from 'rxjs';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { HelperService } from './helper.service';

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

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly helperService: HelperService,
  ) {}

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
 
    const url = this.PRODUCTION_BASE_URL + '/v1/transfer';

  

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

    async handleTransferWebhook(body: any) {
    const eventData = body;

    if (eventData.event !== 'collection') return;

    try {
      const verificationResponse = await this.verifyTransaction(eventData.reference);
      const isVerified = verificationResponse.success && verificationResponse.data.status === 'successful'; // Enhanced check using status from data

      if (!isVerified) {
        throw new InternalServerErrorException('Error verifying transaction: ' + verificationResponse.message);
      }

      // You can use verificationResponse.data for additional details if needed, e.g., to cross-verify amounts
      // For example:
      // if (Number(verificationResponse.data.netAmount) !== Number(eventData.netAmount)) throw new Error('Amount mismatch');

      // Check for existing payment event
      const existingPaymentEvent = await this.prisma.paymentEvent.findFirst({
        where: { refId: eventData.reference },
      });

      if (existingPaymentEvent) return;

      // Get wallet
      const wallet = await this.prisma.wallet.findFirst({
        where: {
          accountNumber: eventData.virtualAccount,
          currency: eventData.destinationCurrency ?? 'NGN',
        },
        include: { user: true },
      });

      if (!wallet) throw new InternalServerErrorException('Wallet not found');

      const oldBalance = wallet.balance;
      const newBalance = oldBalance + Number(eventData.netAmount);

      // Get sender bank name (if needed, perhaps from sourceBankCode)
      const senderBankName = eventData.sourceBankName;

      await Promise.all([
        // Update wallet balance
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance },
        }),
        // Create payment event
        this.prisma.paymentEvent.create({
          data: {
            refId: eventData.reference,
            status: eventData.status ?? 'successful',
            currency: eventData.destinationCurrency ?? 'NGN',
            fee: Number(eventData.transactionFee) + Number(eventData.stampDuty),
            amountPaid: Number(eventData.amountReceived),
            settlementAmount: Number(eventData.netAmount),
          },
        }),
      ]);

      // Create transaction
      await this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          transactionRef: eventData.reference,
          type: TRANSACTION_TYPE.CREDIT,
          category: TRANSACTION_CATEGORY.DEPOSIT,
          currency: eventData.destinationCurrency ?? 'NGN',
          status: TRANSACTION_STATUS.success,
          previousBalance: oldBalance,
          currentBalance: newBalance,
          description: eventData.remarks,
          depositDetails: {
            senderName: eventData.sourceAccountName,
            senderAccountNumber: eventData.sourceAccountNumber,
            senderBankName: eventData.sourceBankName,
            beneficiaryName: wallet.accountName, // Adjust as needed
            beneficiaryAccountNumber: eventData.virtualAccount,
            beneficiaryBankName: 'Bell MFB', // Adjust as needed
            amount: Number(eventData.netAmount),
            amountPaid: Number(eventData.amountReceived),
          },
        },
      });

      // Send alerts (email and SMS) - adapt from the example
      try {
        // Email logic similar to example
        const amount = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(eventData.netAmount);
        const now = new Date();
        const formattedDate = now.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' });

        this.emailService.sendEmail({
          to: wallet.user.email,
          subject: 'Credit Alert',
          template: 'user/credit.hbs',
          context: {
            amount,
            accountName: wallet.accountName,
            accountNumber: wallet.accountNumber, // Mask as needed
            senderName: eventData.sourceAccountName,
            dateAndTime: formattedDate,
            narration: eventData.remarks || '',
            reference: eventData.reference,
            availableBalance: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(newBalance),
            year: new Date().getFullYear(),
          },
        });

        // SMS logic
        this.helperService.sendSms(
          wallet.user.phoneNumber,
          // Adapt getSMSAlertMessage function as needed
          `Credit alert: ${amount} from ${eventData.sourceAccountName}`,
          'termii',
        );
      } catch (error) {
        console.log('Error sending deposit alert', error);
      }
    } catch (error) {
      console.log('error handling Bell webhook', error);
      throw error;
    }
  }

   // Implement verifyTransaction based on Bell docs
  async verifyTransaction(reference: string) {
    const url = `${this.PRODUCTION_BASE_URL}/v1/transactions/reference/${reference}`;
    try {
      const response = await axios.get(url, { headers: await this.getHeaders() });
      return response.data;
    } catch (error) {
      console.log('Error verifying transaction:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to verify transaction');
    }
  }
}




 
