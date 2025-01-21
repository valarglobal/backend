import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '@prisma/client';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VFDBankService {
  private BASE_URL: string;

  private accessTokenCache: {
    accessToken: string;
    issueTime: Date;
    expireIn: number;
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const mode = this.configService.get<string>('VFD_MODE');

    if (mode === 'test') {
      this.BASE_URL = this.configService.get<string>('VFD_TEST_BASE_URL');
    } else {
      this.BASE_URL = this.configService.get<string>('VFD_LIVE_BASE_URL');
    }
  }

  async getAccessToken() {
    //check if we have a valid token that hasn't expired
    if (this.accessTokenCache) {
      const currentTime = new Date();
      const tokenAge =
        (currentTime.getTime() - this.accessTokenCache.issueTime.getTime()) /
        1000;

      if (tokenAge < this.accessTokenCache.expireIn) {
        // Token is still valid, return the existing token
        return this.accessTokenCache;
      }
    }

    const url = this.BASE_URL + '/vfd-tech/baas-portal/v1.1/baasauth/token';

    const payload = {
      consumerKey: this.configService.get<string>('VFD_CONSUMER_KEY'),
      consumerSecret: this.configService.get<string>('VFD_CONSUMER_SECRET'),
      validityTime: '60',
    };

    const response = await axios.post(url, payload);

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to get accessToken');

    const data = response?.data?.data;

    if (data?.access_token && data?.expires_in) {
      this.accessTokenCache = {
        accessToken: data?.access_token,
        issueTime: new Date(),
        expireIn: data?.expires_in,
      };
    }

    return {
      accessToken: data?.access_token,
      expireIn: data?.expires_in,
    };
  }

  async createNoConsentVirtualAccount(payload: {
    bvn: string;
    dateOfBirth: string;
  }) {
    const url =
      this.BASE_URL +
      `/vtech-wallet/api/v1.1/wallet2/client/create?bvn=${payload.bvn}&dateOfBirth=17-Mar-1989`;

    // const url =
    //   this.BASE_URL +
    //   `/vtech-wallet/api/v1.1/wallet2/client/create?previousAccountNo=${1001644278}`;

    let response: any;
    try {
      response = await axios.post(
        url,
        {},
        {
          headers: await this.getHeaders(),
        },
      );
    } catch (error) {
      console.log('error creating account', error);
      throw new InternalServerErrorException(
        'Failed to create virtual account',
      );
    }

    if (response.status !== 200)
      throw new InternalServerErrorException(
        'Failed to create virtual account',
      );

    return response?.data?.data;
  }

  async creditVirtualAccount(payload: {
    amount: string;
    accountNo: string;
    senderAccountNo: string;
    senderBank: string;
    senderNarration: string;
  }) {
    const url =
      'https://api-devapps.vfdbank.systems/vtech-wallet/api/v1.1/wallet2/credit';

    const response = await axios.post(url, payload, {
      headers: await this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to send funds');

    return response.data;
  }

  private async getHeaders() {
    const tokenObj = await this.getAccessToken();

    // console.log('access token', tokenObj?.accessToken);
    return {
      'Content-Type': 'application/json',
      AccessToken: tokenObj?.accessToken,
    };
  }

  async createNoConsentBusinessVirtualAccount(payload: {
    bvn: string;
    incorporationDate: string;
    rcNumber: string;
    companyName: string;
  }) {}

  async getAllAccounts() {
    const url =
      this.BASE_URL +
      `/vtech-wallet/api/v1.1/wallet2/sub-accounts?entity=individual&size=10&page=0`;

    const response = await axios.get(url, {
      headers: await this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to get all accounts');

    return response?.data?.data;
  }

  private generateTransferSignature(
    fromAccount: string,
    toAccount: string,
  ): string {
    const crypto = require('crypto');
    const data = `${fromAccount}${toAccount}`;
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  // transfer funds
  async transferFund(data: {
    fromAccountNo: string;
    toAccountNo: string;
    toBankCode: string;
    amount: string;
    description?: string;
    type: 'intra' | 'inter';
  }) {
    const poolDetails = await this.getMerchantDetails();

    console.log('Merchant pool details', poolDetails);
    const senderDetails = await this.getTransferSenderDetails(
      data.fromAccountNo,
    );

    console.log('sender details', senderDetails);
    const receipientDetails = await this.getReceipientDetails(
      data.toAccountNo,
      data.toBankCode,
      data.type,
    );

    console.log('receipient details', receipientDetails);
    // Generate signature using the new method
    const signature = this.generateTransferSignature(
      poolDetails?.accountNo,
      receipientDetails?.account?.number,
    );

    console.log('signaure', signature);
    // initiate a transfer
    const payload = {
      fromAccount: poolDetails?.accountNo,
      uniqueSenderAccountId: senderDetails?.accountId,
      fromClientId: poolDetails?.clientId,
      fromClient: poolDetails?.client,
      fromSavingsId: poolDetails?.accountId,
      fromBvn: poolDetails?.bvn,
      toClientId: receipientDetails?.clientId,
      toClient: receipientDetails?.name,
      toSavingsId: receipientDetails?.account?.id,
      toSession: receipientDetails?.account?.id,
      toBvn: receipientDetails?.bvn,
      toAccount: receipientDetails?.account?.number,
      toBank: data?.toBankCode,
      signature: signature,
      amount: data?.amount,
      remark: data?.description,
      transferType: data?.type,
      reference: `NattyPay-${uuidv4()}`,
    };

    console.log('payload', payload);
    const url = this.BASE_URL + `/vtech-wallet/api/v1.1/wallet2/transfer`;

    const response = await axios.post(url, payload, {
      headers: await this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to initiate transfer');

    return {
      beneficiaryDetails: receipientDetails,
      data: response?.data?.data,
    };
  }

  // get merchat details
  // get sender details
  async getMerchantDetails() {
    const url =
      this.BASE_URL + `/vtech-wallet/api/v1.1/wallet2/account/enquiry`;

    const response = await axios.get(url, {
      headers: await this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to get sender details');

    return response?.data?.data;
  }

  async tier2Upgrade(payload: { accountNumber: string; nin: string }) {
    const url = this.BASE_URL + `/vtech-wallet/api/v1.1/wallet2//client/update`;

    const response = await axios.post(url, payload, {
      headers: await this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException(
        'Failed to upgrade account to tier2',
      );

    return response?.data?.data;
  }

  async tier3Upgrade(payload: {
    accountNumber: string;
    nin?: string;
    address: string;
  }) {
    const url = this.BASE_URL + `/vtech-wallet/api/v1.1/wallet2/client/update`;

    const response = await axios.post(url, payload, {
      headers: await this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException(
        'Failed to upgrade account to tier3',
      );

    return response?.data?.data;
  }

  // get sender details
  async getTransferSenderDetails(accountNumber: string) {
    const url =
      this.BASE_URL +
      `/vtech-wallet/api/v1.1/wallet2/account/enquiry?accountNumber=${accountNumber}`;

    const response = await axios.get(url, {
      headers: await this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to get sender details');

    return response?.data?.data;
  }

  // get receipient details
  async getReceipientDetails(
    accountNo: string,
    bankCode: string,
    transferType: string,
  ) {
    const url =
      this.BASE_URL +
      `/vtech-wallet/api/v1.1/wallet2/transfer/recipient?accountNo=${accountNo}&bank=${bankCode}&transfer_type=${transferType}`;

    const response = await axios.get(url, {
      headers: await this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException(
        'Failed to get receipient details',
      );

    return response?.data?.data;
  }

  // get bank list
  async getBankList() {
    const url = this.BASE_URL + '/vtech-wallet/api/v1.1/wallet2/bank';

    let response: any;
    try {
      response = await axios.get(url, {
        headers: await this.getHeaders(),
      });
    } catch (error) {
      console.log('error getting banks', error);
      throw new InternalServerErrorException(
        'Failed to get receipient details',
      );
    }

    if (response.status !== 200)
      throw new InternalServerErrorException(
        'Failed to get receipient details',
      );

    return response?.data?.data;
  }

  // handle payment success webhok;
  async handlePaymentSuccess(body: any) {
    console.log('body from webhook', body);
    return await this.prisma.$transaction(
      async (trx) => {
        const { isVerified, data } = await this.verifyTransaction(
          body?.reference,
        );

        if (!isVerified)
          throw new InternalServerErrorException('Error verifying transaction');

        const existimgPaymentEvent = await trx.paymentEvent.findFirst({
          where: {
            refId: body?.reference,
          },
        });

        if (existimgPaymentEvent) return;

        // get wallet
        const wallet = await trx.wallet.findFirst({
          where: {
            accountNumber: body?.account_number,
          },
        });

        const oldBalance = wallet?.balance;
        const newBalance = oldBalance + Number(data?.amount);

        // get user object
        const user = await trx.user.findFirst({
          where: {
            id: wallet?.userId,
          },
        });

        // update the user wallet balance
        await trx.wallet.update({
          where: { id: wallet?.id },
          data: {
            balance: newBalance,
          },
        });

        // create a payment event
        await trx.paymentEvent.create({
          data: {
            refId: body?.reference,
            status: data?.status ?? 'success',
            currency: data?.currency ?? 'NGN',
            fee: data?.app_fee ?? 0,
            amountPaid: Number(data?.amount),
            settlementAmount: Number(data?.amount),
          },
        });

        // create transaction
        await trx.transaction.create({
          data: {
            walletId: wallet?.id,
            transactionRef: body?.reference,
            type: TRANSACTION_TYPE.CREDIT,
            category: TRANSACTION_CATEGORY.DEPOSIT,
            currency: data?.currency ?? 'NGN',
            status: TRANSACTION_STATUS.success,
            previousBalance: oldBalance,
            currentBalance: newBalance,
            depositDetails: {
              senderName: body?.originator_account_name,
              senderAccountNumber: body?.originator_account_number,
              senderBankName: body?.originator_bank,
              amount: Number(data?.amount),
              amountPaid: Number(data?.amount),
            },
          },
        });

        console.log('finish');
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  private async verifyTransaction(reference: string) {
    const url =
      this.BASE_URL +
      `/vtech-wallet/api/v1.1/wallet2/transactions?reference=${reference}`;

    const response = await axios.get(url, {
      headers: await this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to verify transaction');

    const data = response?.data?.data;
    if (data?.transactionType != 'INFLOW') return { isVerified: false };
    return { isVerified: true, data: response?.data?.data };
  }
}
