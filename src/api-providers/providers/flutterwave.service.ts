import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  USER_ACCOUNT_STATUS,
} from '@prisma/client';
import axios from 'axios';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FlutterwaveService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async createVirtualAccount(payload: {
    email: string;
    bvn: string;
    narration: string;
    is_permanent: boolean;
  }) {
    const url =
      this.configService.get<string>('FLUTTERWAVE_BASE_URL') +
      '/v3/virtual-account-numbers';

    const response = await axios.post(url, payload, {
      headers: this.getHeaders(),
    });

    if (response.status != 200)
      throw new InternalServerErrorException(
        'Failed to create virtual account',
      );

    return response?.data;
  }

  async createForeignAccount(payload: {
    account_name: string;
    email: string;
    mobilenumber?: string;
    country: string;
  }) {
    const url =
      this.configService.get<string>('FLUTTERWAVE_BASE_URL') +
      '/v3/payout-subaccounts';

    const response = await axios.post(url, payload, {
      headers: this.getHeaders(),
    });

    if (response.status != 200)
      throw new InternalServerErrorException(
        'Failed to create foreign account',
      );

    return response?.data;
  }

  async deleteVirtualAccount(order_ref: string) {
    const url =
      this.configService.get<string>('FLUTTERWAVE_BASE_URL') +
      `/v3/virtual-account-numbers/${order_ref}`;

    const response = await axios.post(
      url,
      {
        status: 'inactive',
      },

      {
        headers: this.getHeaders(),
      },
    );

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to delete account');

    return response.data;
  }

  async getAllBanks(country: string) {
    const url =
      this.configService.get<string>('FLUTTERWAVE_BASE_URL') +
      `/v3/banks/${country}`;

    const response = await axios.get(url, {
      headers: this.getHeaders(),
    });

    if (response?.status !== 200)
      throw new InternalServerErrorException('Failed to get banks');

    return response?.data;
  }

  async initiateTransfer(payload: {
    account_bank: string;
    account_number: string;
    amount: number;
    currency: string;
    debit_subaccount: string;
  }) {
    const url =
      this.configService.get<string>('FLUTTERWAVE_BASE_URL') + '/v3/transfers';

    const response = await axios.post(url, payload, {
      headers: this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to initiate transfer');

    return response?.data;
  }

  async getBillInfo(billerCode: string) {
    const url =
      this.configService.get<string>('FLUTTERWAVE_BASE_URL') +
      `/v3/billers/${billerCode}/items`;

    const response = await axios.get(url, {
      headers: this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to get bill information');

    return response?.data?.data;
  }

  async verifyBillerNumber(
    itemCode: string,
    payload: {
      code: string;
      customer: string;
    },
  ) {
    let response: any;

    try {
      const url =
        this.configService.get<string>('FLUTTERWAVE_BASE_URL') +
        `/v3/bill-items/${itemCode}/validate`;

      response = await axios.get(url, {
        headers: this.getHeaders(),
        params: payload,
      });
    } catch (error) {
      // console.log('error while verifying biller number', error);
      // throw new BadRequestException(error?.response?.data?.message);
      throw error;
    }

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to verify biller number');

    return response?.data?.data;
  }

  async verifyAccount(payload: {
    account_number: string;
    account_bank: string;
  }) {
    const url =
      this.configService.get<string>('FLUTTERWAVE_BASE_URL') +
      '/v3/accounts/resolve';

    const response = await axios.post(url, payload, {
      headers: this.getHeaders(),
    });

    if (response.status !== 200)
      throw new InternalServerErrorException(
        'Failed to verify account details',
      );

    return response?.data;
  }

  async purchaseBill(
    itemCode: string,
    billerCode: string,
    payload: {
      customer_id: string;
      country: string;
      amount: number;
      reference: string;
    },
  ) {
    const url =
      this.configService.get<string>('FLUTTERWAVE_BASE_URL') +
      `/v3/billers/${billerCode}/items/${itemCode}/payment`;

    let response: any;
    try {
      response = await axios.post(url, payload, {
        headers: this.getHeaders(),
      });
    } catch (error) {
      console.log('error paying for bill', error);
      throw error;
    }

    if (response.status !== 200)
      throw new InternalServerErrorException('Failed to purchase bill');

    return response?.data?.data;
  }

  private getHeaders() {
    const secretKey = this.configService.get<String>('FLUTTERWAVE_SECRET_KEY');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secretKey}`,
    };
  }

  async handlePaymentSuccess(body: any) {
    const data = body?.data;
    const metaData = body?.meta_data;

    return this.prisma.$transaction(
      async (trx) => {
        const { isVerified, data: trxData } = await this.verifyTransaction(
          data?.id,
          data?.amount,
          data?.currency,
        );

        if (!isVerified)
          throw new InternalServerErrorException('Error verifying transaction');

        const existimgPaymentEvent = await trx.paymentEvent.findFirst({
          where: {
            refId: String(data?.id),
          },
        });

        if (existimgPaymentEvent?.status === data?.status) return;

        const user = await trx.user.findFirst({
          where: {
            email: data?.customer?.email,
          },
        });

        if (!user)
          throw new InternalServerErrorException(
            'User account with email does not exist',
          );

        const wallet = await trx.wallet.findFirst({
          where: {
            userId: user.id,
            currency: data?.currency ?? 'NGN',
          },
        });

        if (!wallet)
          throw new InternalServerErrorException('User wallet not found');

        const oldBalance = wallet?.balance;
        const newBalance = oldBalance + trxData?.amount_settled;

        //check if the amount credited is above the singleCreditLimit
        if (Number(data?.amount) > user?.dailyCummulativeTransactionLimit) {
          await trx.user.update({
            where: {
              id: user?.id,
            },
            data: {
              status: USER_ACCOUNT_STATUS.restricted,
            },
          });
        }

        //check if the daily amount credited is above the dailyCreditLimit
        const totalCreditDepositAmount = await trx.$queryRaw<
          { total: number }[]
        >`
          SELECT SUM(("depositDetails"->>'amountPaid')::numeric) AS total
          FROM transaction
          WHERE "walletId" = ${wallet?.id}::uuid
            AND category = 'DEPOSIT'
            AND type = 'CREDIT'
            AND status = 'success'
            AND DATE("createdAt") = CURRENT_DATE; -- Assuming "createdAt" is the timestamp column
        `;

        const totalAmount = totalCreditDepositAmount[0]?.total || 0;

        console.log('totalAmount of debit deposit transaction', totalAmount);
        if (totalAmount > user?.dailyCummulativeTransactionLimit) {
          await trx.user.update({
            where: {
              id: user?.id,
            },
            data: {
              status: USER_ACCOUNT_STATUS.restricted,
            },
          });
        }

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
            refId: String(data?.id),
            status: data?.status,
            currency: data?.currency,
            fee: data?.app_fee,
            amountPaid: data?.amount,
            settlementAmount: trxData?.amount_settled,
          },
        });

        // create transaction
        await trx.transaction.create({
          data: {
            walletId: wallet?.id,
            transactionRef: String(data?.id),
            type: TRANSACTION_TYPE.CREDIT,
            category: TRANSACTION_CATEGORY.DEPOSIT,
            currency: data?.currency,
            status: TRANSACTION_STATUS.success,
            previousBalance: oldBalance,
            currentBalance: newBalance,
            depositDetails: {
              senderName: metaData?.originatorname,
              senderAccountNumber: metaData?.originatoraccountnumber,
              senderBankName: metaData?.bankname,
              amount: trxData?.amount_settled,
              amountPaid: data?.amount,
              fee: data?.app_fee,
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

  async handlePaymentFailure(body: any) {
    const data = body?.data;
    const metaData = body?.meta_data;

    return this.prisma.$transaction(
      async (trx) => {
        const existimgPaymentEvent = await trx.paymentEvent.findFirst({
          where: {
            refId: String(data?.id),
          },
        });

        if (existimgPaymentEvent?.status === data?.status) return;

        const user = await trx.user.findFirst({
          where: {
            email: data?.customer?.email,
          },
        });

        if (!user)
          throw new InternalServerErrorException(
            'User account with email does not exist',
          );

        const wallet = await trx.wallet.findFirst({
          where: {
            userId: user.id,
            currency: data?.currency ?? 'NGN',
          },
        });

        if (!wallet)
          throw new InternalServerErrorException('User wallet not found');

        // create a payment event
        await trx.paymentEvent.create({
          data: {
            refId: String(data?.id),
            status: data?.satus,
            currency: data?.currency,
            fee: data?.app_fee,
            amountPaid: data?.amount,
            settlementAmount: 0,
          },
        });

        // create failed transaction
        await trx.transaction.create({
          data: {
            walletId: wallet?.id,
            transactionRef: String(data?.id),
            type: TRANSACTION_TYPE.CREDIT,
            category: TRANSACTION_CATEGORY.DEPOSIT,
            currency: data?.currency,
            status: TRANSACTION_STATUS.failed,
            previousBalance: wallet?.balance,
            currentBalance: wallet?.balance,
            depositDetails: {
              senderName: metaData?.originatorname,
              senderAccountNumber: metaData?.originatoraccountnumber,
              senderBankName: metaData?.bankname,
              amount: data?.amount,
              amountPaid: data?.amount,
              fee: data?.app_fee,
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

  async handleTransferSuccess(body: any) {
    const data = body?.data;

    return await this.prisma.$transaction(
      async (trx) => {
        const existimgPaymentEvent = await trx.paymentEvent.findFirst({
          where: {
            refId: data?.reference,
          },
        });

        if (existimgPaymentEvent?.status === data?.status) return;

        const existingTrx = await trx.transaction.findFirst({
          where: {
            transferDetails: {
              path: ['beneficiaryAccountNumber'],
              equals: data?.account_number,
            },
            status: TRANSACTION_STATUS.pending,
            reference: data?.reference,
          },
        });

        if (!existingTrx)
          throw new InternalServerErrorException('Transaction not found');

        await trx.transaction.update({
          where: {
            id: existingTrx.id,
          },
          data: {
            status: TRANSACTION_STATUS.success,
          },
        });

        // create a payment event
        await trx.paymentEvent.create({
          data: {
            refId: data?.reference,
            status: data?.status,
            currency: data?.currency,
            fee: data?.fee,
            amountPaid: data?.amount,
          },
        });

        console.log('finish');
      },

      {
        isolationLevel: 'Serializable',
      },
    );
  }

  async handleTransferFailure(body: any) {
    const data = body?.data;

    return await this.prisma.$transaction(
      async (trx) => {
        const existimgPaymentEvent = await trx.paymentEvent.findFirst({
          where: {
            refId: data?.reference,
          },
        });

        if (existimgPaymentEvent?.status === data?.status) return;

        const existingTrx = await trx.transaction.findFirst({
          where: {
            transferDetails: {
              path: ['beneficiaryAccountNumber'],
              equals: data?.account_number,
            },
            status: TRANSACTION_STATUS.pending,
            reference: data?.reference,
          },
        });

        if (!existingTrx)
          throw new InternalServerErrorException('Transaction not found');

        // add the amount back
        await trx.wallet.update({
          where: {
            id: existingTrx?.walletId,
          },
          data: {
            balance: existingTrx?.previousBalance,
          },
        });

        //update the transaction to failed trx
        await trx.transaction.update({
          where: {
            id: existingTrx.id,
          },
          data: {
            status: TRANSACTION_STATUS.failed,
          },
        });

        // create a payment event
        await trx.paymentEvent.create({
          data: {
            refId: data?.reference,
            status: data?.status,
            currency: data?.currency,
            fee: data?.fee,
            amountPaid: data?.amount,
          },
        });

        console.log('finish');
      },

      {
        isolationLevel: 'Serializable',
      },
    );
  }

  private async verifyTransaction(
    id: string,
    amount: number,
    currency: string,
  ) {
    const url =
      this.configService.get<string>('FLUTTERWAVE_BASE_URL') +
      `/v3/transactions/${id}/verify`;

    const response = await axios.get(url, { headers: this.getHeaders() });

    if (response?.status === 200) {
      if (
        response.data.data?.status === 'successful' &&
        response.data.data?.amount === amount &&
        response.data.data?.currency === currency
      ) {
        return { isVerified: true, data: response.data.data };
      } else return { isVerified: false };
    } else {
      return { isVerified: false };
    }
  }
}
