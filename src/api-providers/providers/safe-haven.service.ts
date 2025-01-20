import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '@prisma/client';
import axios from 'axios';
import { defaultBankName } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SafeHavenService {
  private accessTokenCache: {
    accessToken: string;
    ibsClientId: string;
    issueTime: Date;
    expireIn: number;
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getAccessToken(refreshToken?: string) {
    // // Check if we have a valid token that hasn't expired
    // if (this.accessTokenCache) {
    //   const currentTime = new Date();
    //   const tokenAge =
    //     (currentTime.getTime() - this.accessTokenCache.issueTime.getTime()) /
    //     1000;

    //   if (tokenAge < this.accessTokenCache.expireIn) {
    //     // Token is still valid, return the existing token
    //     return this.accessTokenCache;
    //   }
    // }

    // Token doesn't exist or has expired, request a new one
    const url =
      this.configService.get<string>('SAFEHAVEN_BASE_URL') + '/oauth2/token';
    const payload = {
      grant_type: 'client_credentials',
      client_assertion: this.configService.get<string>(
        'SAFEHAVEN_CLIENT_ASSERTION',
      ),
      client_id: this.configService.get<string>('SAFEHAVEN_CLIENT_ID'),
      client_assertion_type:
        'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      referesh_token: refreshToken,
    };

    const response = await axios.post(url, payload);

    // console.log('response from accessToken', response?.data, response.status);
    if (response.status !== 201) {
      throw new InternalServerErrorException('Failed to get access token');
    }

    const data = response?.data;
    if (data?.access_token && data?.expires_in) {
      this.accessTokenCache = {
        accessToken: data?.access_token,
        ibsClientId: data?.ibs_client_id,
        issueTime: new Date(),
        expireIn: data?.expires_in,
      };
    }
    return {
      accessToken: data?.access_token,
      ibsClientId: data?.ibs_client_id,
    };
  }

  async initiateVerification(body: safeHavenInitiateVerification) {
    try {
      const url =
        this.configService.get<string>('SAFEHAVEN_BASE_URL') + '/identity/v2';

      let response: any;
      try {
        const token = await this.getAccessToken();
        response = await axios.post(url, body, {
          headers: this.getHeaders(token?.accessToken, token?.ibsClientId),
        });
      } catch (error) {
        console.log('error verifying bvn', error);
        throw error;
      }

      console.log('response', response?.data);
      if (response.status !== 201) {
        throw new InternalServerErrorException('Failed to verify bvn');
      }

      return response?.data;
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async validateVerification(body: safeHavenValidateVerification) {
    try {
      const url =
        this.configService.get<string>('SAFEHAVEN_BASE_URL') +
        '/identity/v2/validate';

      const token = await this.getAccessToken();
      const response = await axios.post(url, body, {
        headers: this.getHeaders(token?.accessToken, token?.ibsClientId),
      });

      if (response.status !== 201) {
        throw new InternalServerErrorException('Failed to validate bvn');
      }

      return response?.data;
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async createSubAccount(body: safeHavenCreateAccount) {
    try {
      const token = await this.getAccessToken();

      const url =
        this.configService.get<string>('SAFEHAVEN_BASE_URL') +
        '/accounts/v2/subaccount';

      const payload = {
        phoneNumber: body.phoneNumber,
        emailAddress: body?.emailAddress,
        externalReference: body?.externalReference,
        identityNumber: body?.bvn,
        identityType: 'BVN',
        identityId: body?.verificationId,
        otp: body?.otpCode,
        autoSweep: true,
        autoSweepDetails: {
          schedule: 'Instant',
        },
      };

      let response: any;

      try {
        response = await axios.post(url, payload, {
          headers: this.getHeaders(token?.accessToken, token?.ibsClientId),
        });
      } catch (error) {
        console.log('error creating sub account', error);
        throw error;
      }

      console.log('create account response status', response?.data);
      if (response.status !== 201) {
        throw new InternalServerErrorException('Failed to create sub account');
      }

      return response?.data?.data;
    } catch (error) {
      console.log('error', error);
      throw error;
    }
  }

  async getAllBanks() {
    const url =
      this.configService.get<string>('SAFEHAVEN_BASE_URL') + '/transfers/banks';

    const token = await this.getAccessToken();

    const response = await axios.get(url, {
      headers: this.getHeaders(token?.accessToken, token?.ibsClientId),
    });

    if (response.status !== 200) {
      throw new InternalServerErrorException('Failed to get banks');
    }

    return response?.data;
  }

  async getNameEquiry(bankCode: string, accountNumber: string) {
    const url =
      this.configService.get<string>('SAFEHAVEN_BASE_URL') +
      '/transfers/name-enquiry';

    const token = await this.getAccessToken();

    let response: any;
    try {
      response = await axios.post(
        url,
        {
          bankCode,
          accountNumber,
        },
        {
          headers: this.getHeaders(token?.accessToken, token?.ibsClientId),
        },
      );
    } catch (error) {
      console.log('error ', error);
      throw error;
    }

    if (response.status !== 201) {
      throw new InternalServerErrorException('Failed to get name enquiry');
    }

    return response?.data;
  }

  async transerFund(payload: {
    nameEnquiryReference: string;
    debitAccountNumber: string;
    beneficiaryBankCode: string;
    beneficiaryAccountNumber: string;
    amount: number;
    narration: string;
    paymentReference?: string;
    saveBeneficiary?: boolean;
  }) {
    const url =
      this.configService.get<string>('SAFEHAVEN_BASE_URL') + '/transfers';

    const token = await this.getAccessToken();

    let response: any;
    try {
      response = await axios.post(url, payload, {
        headers: this.getHeaders(token?.accessToken, token?.ibsClientId),
      });
    } catch (error) {
      console.log('error transfering', error);
      throw error;
    }

    if (response.status !== 201) {
      throw new InternalServerErrorException('Failed to transfer fund');
    }

    return response?.data;
  }

  private getHeaders(token: string, ibsClientId: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ClientID: ibsClientId,
    };
  }

  async handleTransferWebhook(body: any) {
    const eventData = body?.data;
    console.log('eventData', eventData);

    try {
      const { isVerified } = await this.verifyTransferTransaction(
        body?.reference,
      );

      console.log('isVerified', isVerified);

      if (!isVerified)
        throw new InternalServerErrorException('Error verifying transaction');

      const existimgPaymentEvent = await this.prisma.paymentEvent.findFirst({
        where: {
          refId: eventData?.paymentReference,
        },
      });

      if (existimgPaymentEvent) return;

      // get wallet
      const wallet = await this.prisma.wallet.findFirst({
        where: {
          accountNumber: eventData?.creditAccountNumber,
        },
      });

      if (!wallet) throw new InternalServerErrorException('Wallet not found');

      const oldBalance = wallet?.balance;
      // const newBalance =
      //   oldBalance + (Number(eventData?.amount) - Number(eventData?.fee));
      const newBalance = oldBalance + Number(eventData?.amount);

      // update the user wallet balance
      await this.prisma.wallet.update({
        where: { id: wallet?.id },
        data: {
          balance: newBalance,
        },
      });

      // create a payment event
      await this.prisma.paymentEvent.create({
        data: {
          refId: eventData?.paymentReference,
          status: eventData?.status ?? 'success',
          currency: eventData?.currency ?? 'NGN',
          fee: eventData?.fee ?? 0,
          amountPaid: Number(eventData?.amount),
          settlementAmount: Number(eventData?.amount),
        },
      });

      // create transaction
      await this.prisma.transaction.create({
        data: {
          walletId: wallet?.id,
          transactionRef: eventData?.paymentReference,
          type: TRANSACTION_TYPE.CREDIT,
          category: TRANSACTION_CATEGORY.DEPOSIT,
          currency: eventData?.currency ?? 'NGN',
          status: TRANSACTION_STATUS.success,
          previousBalance: oldBalance,
          currentBalance: newBalance,
          description: eventData?.narration,
          depositDetails: {
            senderName: eventData?.debitAccountName,
            senderAccountNumber: eventData?.debitAccountNumber,
            senderBankName: eventData?.destinationInstitutionCode,
            beneficiaryName: eventData?.creditAccountName,
            beneficiaryAccountNumber: eventData?.creditAccountNumber,
            beneficiaryBankName: defaultBankName,
            amount: Number(eventData?.amount) - Number(eventData?.fee),
            amountPaid: Number(eventData?.amount),
          },
        },
      });

      console.log('finish');
    } catch (error) {
      console.log('error funding account', error);
      throw error;
    }
  }

  async verifyTransferTransaction(sessionId: string) {
    const url =
      this.configService.get<string>('SAFEHAVEN_BASE_URL') +
      '/transfers/status';

    const token = await this.getAccessToken();

    const response = await axios.post(
      url,
      { sessionId },
      {
        headers: this.getHeaders(token?.accessToken, token?.ibsClientId),
      },
    );

    if (response.status !== 201) {
      throw new InternalServerErrorException('Failed to verify transfer');
    }

    const data = response?.data?.data;

    console.log('data', data);
    if (data?.type == 'Inwards' && data?.status === 'Completed') {
      return { isVerified: true, data: response?.data?.data };
    }
    return { isVerified: false };
  }
}
