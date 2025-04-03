import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '@prisma/client';
import axios from 'axios';
import { defaultBankName } from 'src/constants';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { getSMSAlertMessage } from 'src/utils';
import { HelperService } from './helper.service';

@Injectable()
export class SafeHavenService {
  // private accessTokenCache: {
  //   accessToken: string;
  //   ibsClientId: string;
  //   issueTime: Date;
  //   expireIn: number;
  // };

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly helperService: HelperService,
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
    // if (data?.access_token && data?.expires_in) {
    //   this.accessTokenCache = {
    //     accessToken: data?.access_token,
    //     ibsClientId: data?.ibs_client_id,
    //     issueTime: new Date(),
    //     expireIn: data?.expires_in,
    //   };
    // }

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

  async createSubAccount(
    body: safeHavenCreateAccount,
    type: 'personal' | 'business',
  ) {
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
          accountNumber: this.configService.get<string>(
            'SAFEHAVE_DEBIT_ACCOUNT_NUMBER',
          ),
        },
      } as any;

      if (type === 'business') {
        payload.companyRegistrationNumber = body?.companyRegistrationNumber;
      }

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

  async createBusinessSubAccount(body: safeHavenCreateBusinessAccount) {
    try {
      const token = await this.getAccessToken();

      const url =
        this.configService.get<string>('SAFEHAVEN_BASE_URL') +
        '/accounts/v2/subaccount';
    } catch (error) {}
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
    debitAccountInfo: {
      debitAccountNumber: string;
    };
  }) {
    const url =
      this.configService.get<string>('SAFEHAVEN_BASE_URL') + '/transfers';

    const token = await this.getAccessToken();

    console.log('payload for transfer', payload);
    let response: any;
    try {
      response = await axios.post(url, payload, {
        headers: this.getHeaders(token?.accessToken, token?.ibsClientId),
      });
    } catch (error) {
      console.log('error transfering', error);
      throw error;
    }

    console.log('response from transfer', response?.data);
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
    // console.log('eventData', eventData);

    if (eventData?.type === 'Outwards') return;

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
          currency: eventData?.currency ?? 'NGN',
        },
        include: {
          user: true,
        },
      });

      if (!wallet) throw new InternalServerErrorException('Wallet not found');

      const oldBalance = wallet?.balance;
      // const newBalance =
      //   oldBalance + (Number(eventData?.amount) - Number(eventData?.fee));
      const newBalance = oldBalance + Number(eventData?.amount);

      const senderBankCode = eventData?.sessionId?.substring(0, 6);

      const [senderBankName] = await Promise.all([
        // get sender bank name from the sessionId - the bankCode is the first 6 digit from  the sessionId
        this.getBankName(senderBankCode),
        // update the user wallet balance
        this.prisma.wallet.update({
          where: { id: wallet?.id },
          data: {
            balance: newBalance,
          },
        }),
        // create a payment event
        this.prisma.paymentEvent.create({
          data: {
            refId: eventData?.paymentReference,
            status: eventData?.status ?? 'success',
            currency: eventData?.currency ?? 'NGN',
            fee: eventData?.fee ?? 0,
            amountPaid: Number(eventData?.amount),
            settlementAmount: Number(eventData?.amount),
          },
        }),
      ]);

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
            senderBankName,
            beneficiaryName: eventData?.creditAccountName,
            beneficiaryAccountNumber: eventData?.creditAccountNumber,
            beneficiaryBankName: defaultBankName,
            amount: Number(eventData?.amount) - Number(eventData?.fees),
            amountPaid: Number(eventData?.amount),
          },
        },
      });

      try {
        //send credit alert email
        const accountSNum = wallet.accountNumber;
        const accountRNum = eventData?.debitAccountNumber;
        const maskedSAccountNumber = `${accountSNum.substring(0, 2)}xxx..${accountSNum.substring(accountSNum.length - 4, accountSNum.length - 1)}x`;
        const maskedRAccountNumber = `${accountRNum.substring(0, 2)}xxx..${accountRNum.substring(accountRNum.length - 4, accountRNum.length - 1)}x`;

        const amount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(eventData?.amount);

        const now = new Date();
        const formattedDate = now.toLocaleString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Africa/Lagos',
        });

        this.emailService.sendEmail({
          to: wallet?.user?.email,
          subject: 'Credit Alert',
          template: 'user/credit.hbs',
          context: {
            amount,
            accountName: wallet.accountName
              .split('/')[1]
              .split(' ')
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
              )
              .join(' '),
            accountNumber: maskedSAccountNumber,
            senderName: eventData?.debitAccountName,
            dateAndTime: formattedDate,
            narration: eventData?.narration || '',
            reference: eventData?.paymentReference,
            availableBalance: new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(Number(newBalance.toFixed(2))),
            year: new Date().getFullYear(),
          },
        });

        //send credit sms alert
        this.helperService.sendSms(
          wallet.user.phoneNumber,
          getSMSAlertMessage(
            amount,
            wallet?.accountName,
            eventData?.debitAccountName,
            eventData?.paymentReference,
            formattedDate,
            newBalance,
            'transfer',
            {
              isCredit: true,
            },
            maskedSAccountNumber,
            maskedRAccountNumber,
            senderBankName.toUpperCase(),
          ),
          'termii',
        );
      } catch (error) {
        console.log('Error sending deposit alert', error);
      }

      console.log('finish');
    } catch (error) {
      console.log('error funding account', error);
      throw error;
    }
  }

  async getBankName(code: string) {
    const data = await this.getAllBanks();
    const banks = data?.data;
    return banks?.find((bank: { bankCode: string }) => bank?.bankCode === code)
      ?.name;
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

    if (data?.type == 'Inwards' && data?.status === 'Completed') {
      return { isVerified: true, data: response?.data?.data };
    }
    return { isVerified: false };
  }
}
