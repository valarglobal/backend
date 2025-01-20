import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { ApiProviderService } from 'src/api-providers/api-providers.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransferDto } from './dto/TransferDto';
import {
  Prisma,
  TIER_LEVEL,
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  User,
  USER_ACCOUNT_STATUS,
  Wallet,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import { VerifyAccountDto } from './dto/VerifyAccountDto';
import { InitiateBvnVerificationDto } from './dto/InitiateBvnVerificationDto';
import { ValidateBvnVerificationDto } from './dto/ValidateBvnVerificationDto';
import {
  defaultBankCode,
  TIER_ONE_COMMULATIVE_BALANCE_LIMIT,
  TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
} from 'src/constants';
import * as bcrypt from 'bcrypt';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiProvider: ApiProviderService,
  ) {}

  async getAllBanks(currency: string) {
    const banks: any = await this.apiProvider.getAllBanks(currency);

    return {
      message: 'Banks retrieve successfully',
      statusCode: HttpStatus.OK,
      data: banks?.data,
    };
  }

  async getTransactions(
    page: number,
    limit: number,
    type: TRANSACTION_TYPE,
    category: TRANSACTION_CATEGORY,
    status: TRANSACTION_STATUS,
    search: string,
    user: User & { wallet?: any },
  ) {
    let response: any;
    if (page && limit) {
      const skip = (page - 1) * limit;

      const [transactions, totalCount] = await Promise.all([
        this.prisma.transaction.findMany({
          skip,
          take: Number(limit),
          where: {
            walletId: user?.wallet?.id,
            type,
            category,
            status,
            transactionRef: search,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.transaction.count({
          where: {
            walletId: user?.wallet?.id,
            type,
            category,
            status,
            transactionRef: search,
          },
        }),
      ]);

      response = {
        transactions,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      };
    } else {
      const transactions = await this.prisma.transaction.findMany({
        where: {
          walletId: user?.wallet?.id,
          type,
          category,
        },
        orderBy: { createdAt: 'desc' },
      });

      response = {
        transactions,
      };
    }

    return {
      message: 'Transactions retrieve successfully',
      statusCode: HttpStatus.OK,
      ...response,
    };
  }

  async fetchTransferFee(
    currency: string,
    amount: number,
    accountNumber: string,
  ) {
    // this.checkforMinimumAndMaximumAmount(currency, amount);

    const wallet = await this.prisma.wallet.findFirst({
      where: {
        accountNumber,
      },
    });

    let fee: number;

    if (wallet) {
      fee = 0;
    } else {
      fee = this.getTransferFee(currency, amount);
    }

    return {
      message: 'Fee retrieve successfully',
      statusCode: HttpStatus.OK,
      data: {
        fee: fee,
      },
    };
  }

  async transferVFDFund(body: TransferDto, user: User & { wallet?: any }) {
    // check if the account is restricted
    if (user?.status === USER_ACCOUNT_STATUS.restricted)
      throw new NotAcceptableException(
        'Your account has been restricted. Please contact support for assistance.',
      );

    // check for minimum amount to transfer
    this.checkforMinimumAndMaximumAmount(body.currency, body.amount, user);

    const toWallet = await this.prisma.wallet.findFirst({
      where: {
        accountNumber: body.accountNumber,
        currency: body.currency,
      },
    });

    const fromWallet = await this.prisma.wallet.findFirst({
      where: {
        userId: user?.id,
        currency: body.currency,
      },
    });

    if (fromWallet?.id === toWallet?.id)
      throw new BadRequestException('Enter a valid account number');

    if (!fromWallet)
      throw new NotFoundException(
        `Wallet of ${body.currency} not created, please create a wallet to initiate a transfer`,
      );

    if (body.amount > fromWallet?.balance)
      throw new BadRequestException('Insufficient Funds');

    let fee: any;

    // check for 10 free transactions and aggregate the total transaction amount for the current day
    const [trxCount, totalDebitTransferAmount] = await Promise.all([
      this.prisma.transaction.count({
        where: {
          walletId: user?.wallet?.id,
          category: TRANSACTION_CATEGORY.TRANSFER,
        },
      }),
      this.prisma.$queryRaw<{ total: number }[]>`
          SELECT SUM(("transferDetails"->>'amount')::numeric) AS total
          FROM transaction
          WHERE "walletId" = ${user?.wallet?.id}::uuid
            AND category = 'TRANSFER'
            AND type = 'DEBIT'
            AND status = 'success'
            AND DATE("createdAt") = CURRENT_DATE; -- Assuming "createdAt" is the timestamp column
        `,
    ]);

    const totalAmount = totalDebitTransferAmount[0]?.total || 0;

    console.log('totalAmount of transaction', totalAmount);

    if (totalAmount > user?.dailyCummulativeTransactionLimit)
      throw new BadRequestException(
        `You have exceeded your daily transaction limit of ${user?.dailyCummulativeTransactionLimit}. Please wait until the next day or upgrade your account to increase your limit.`,
      );

    fee =
      trxCount <= 10
        ? 0
        : toWallet
          ? 0
          : this.getTransferFee(body.currency, body.amount);

    if (body.fee && body.fee !== fee) {
      throw new BadRequestException('Incorrect transfer fee');
    }

    const amountPaid = body.amount + fee;

    let fromWalletNewBalance: number;
    if (toWallet) {
      let response: any;
      try {
        response = await this.apiProvider.transferVFDFund(body, 'intra', user);
      } catch (error) {
        console.log('error initiating intra transfer', error);

        if (error.response?.status == 400)
          throw new BadRequestException(error?.response?.data?.message);

        throw error;
      }

      console.log('response from intra transfer', response);
      await this.prisma.$transaction(
        async (trx) => {
          // lock from wallet for updates
          const lockfromWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid FOR UPDATE LIMIT 1`;

          fromWalletNewBalance = await this.deductBalance(
            lockfromWallet[0],
            amountPaid,
            trx,
          );

          console.log('new balance', fromWalletNewBalance);

          // create a debit transaction
          await trx.transaction.create({
            data: {
              walletId: fromWallet.id,
              transactionRef: this.generateTransactionRef('DEBIT'),
              type: TRANSACTION_TYPE.DEBIT,
              currency: body.currency,
              status: TRANSACTION_STATUS.success,
              description: body.description,
              previousBalance: fromWallet?.balance,
              currentBalance: fromWalletNewBalance,
              transferDetails: {
                senderName: fromWallet?.accountName,
                senderAccountNumber: fromWallet?.accountNumber,
                senderBankName: fromWallet?.bankName,
                beneficiaryName: toWallet?.accountName,
                beneficiaryAccountNumber: toWallet?.accountNumber,
                beneficiaryBankName: toWallet?.bankName,
                amount: body.amount,
                fee,
              },
            },
          });
        },
        {
          isolationLevel: 'Serializable',
          timeout: 20000,
        },
      );
    } else {
      let response: { beneficiaryDetails: any; data: any };
      try {
        response = await this.apiProvider.transferVFDFund(body, 'inter', user);
      } catch (error) {
        console.log('error initiating inter transfer', error);
        if (error.response?.status == 400)
          throw new BadRequestException(error?.response?.data?.message);
        throw error;
      }

      await this.prisma.$transaction(
        async (trx) => {
          // lock from wallet for updates
          const lockfromWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid FOR UPDATE LIMIT 1`;

          fromWalletNewBalance = await this.deductBalance(
            lockfromWallet[0],
            amountPaid,
            trx,
          );

          // create a debit transaction
          await trx.transaction.create({
            data: {
              walletId: fromWallet.id,
              transactionRef: this.generateTransactionRef('DEBIT'),
              type: TRANSACTION_TYPE.DEBIT,
              status: TRANSACTION_STATUS.success,
              currency: body.currency,
              description: body.description,
              previousBalance: fromWallet?.balance,
              currentBalance: fromWalletNewBalance,
              reference: response?.data?.reference,
              transferDetails: {
                senderName: fromWallet?.accountName,
                senderAccountNumber: fromWallet?.accountNumber,
                senderBankName: fromWallet?.bankName,
                beneficiaryName: response?.beneficiaryDetails?.name,
                beneficiaryAccountNumber:
                  response?.beneficiaryDetails?.account?.number,
                beneficiaryBankName: response?.beneficiaryDetails?.bank,
                amount: body.amount,
                sessionId: response?.data?.sessionId,
                fee,
              },
            },
          });
        },
        {
          isolationLevel: 'Serializable',
        },
      );
    }

    return {
      message: 'Transfer initiated successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async transferFund(body: TransferDto, user: User & { wallet?: any }) {
    // check if the account is restricted
    if (user?.status === USER_ACCOUNT_STATUS.restricted)
      throw new NotAcceptableException(
        'Your account has been restricted. Please contact support for assistance.',
      );

    // check for minimum amount to transfer
    this.checkforMinimumAndMaximumAmount(body.currency, body.amount, user);

    const toWallet = await this.prisma.wallet.findFirst({
      where: {
        accountNumber: body.accountNumber,
        currency: body.currency,
      },
    });

    const fromWallet = await this.prisma.wallet.findFirst({
      where: {
        userId: user?.id,
        currency: body.currency,
      },
    });

    if (fromWallet?.id === toWallet?.id)
      throw new BadRequestException('Enter a valid account number');

    if (!fromWallet)
      throw new NotFoundException(
        `Wallet of ${body.currency} not created, please create a wallet to initiate a transfer`,
      );

    if (body.amount > fromWallet?.balance)
      throw new BadRequestException('Insufficient Funds');

    let fee: any;

    // check for 10 free transactions and aggregate the total transaction amount for the current day
    const [trxCount, totalDebitTransferAmount] = await Promise.all([
      this.prisma.transaction.count({
        where: {
          walletId: user?.wallet?.id,
          category: TRANSACTION_CATEGORY.TRANSFER,
        },
      }),
      this.prisma.$queryRaw<{ total: number }[]>`
          SELECT SUM(("transferDetails"->>'amount')::numeric) AS total
          FROM transaction
          WHERE "walletId" = ${user?.wallet?.id}::uuid
            AND category = 'TRANSFER'
            AND type = 'DEBIT'
            AND status = 'success'
            AND DATE("createdAt") = CURRENT_DATE; -- Assuming "createdAt" is the timestamp column
        `,
    ]);

    const totalAmount = totalDebitTransferAmount[0]?.total || 0;

    console.log('totalAmount of transaction', totalAmount);

    if (totalAmount > user?.dailyCummulativeTransactionLimit)
      throw new BadRequestException(
        `You have exceeded your daily transaction limit of ${user?.dailyCummulativeTransactionLimit}. Please wait until the next day or upgrade your account to increase your limit.`,
      );

    fee =
      trxCount <= 10
        ? 0
        : toWallet
          ? 0
          : this.getTransferFee(body.currency, body.amount);

    if (body.fee && body.fee !== fee) {
      throw new BadRequestException('Incorrect transfer fee');
    }

    const amountPaid = body.amount + fee;

    let fromWalletNewBalance: number;
    if (toWallet) {
      await this.prisma.$transaction(
        async (trx) => {
          // lock from wallet for updates
          const lockfromWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid FOR UPDATE LIMIT 1`;

          const lockToWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${toWallet.id}::uuid FOR UPDATE LIMIT 1`;

          fromWalletNewBalance = await this.deductBalance(
            lockfromWallet[0],
            amountPaid,
            trx,
          );

          const toWalletNewBalance = await this.addbalance(
            lockToWallet[0],
            body.amount,
            trx,
          );

          // create a credit transaction
          await trx.transaction.create({
            data: {
              walletId: toWallet.id,
              transactionRef: this.generateTransactionRef('CREDIT'),
              type: TRANSACTION_TYPE.CREDIT,
              currency: body.currency,
              status: TRANSACTION_STATUS.success,
              description: body.description,
              previousBalance: toWallet?.balance,
              currentBalance: toWalletNewBalance,
              transferDetails: {
                senderName: fromWallet?.accountName,
                senderAccountNumber: fromWallet?.accountNumber,
                senderBankName: fromWallet?.bankName,
                beneficiaryName: toWallet?.accountName,
                beneficiaryAccountNumber: toWallet?.accountNumber,
                beneficiaryBankName: toWallet?.bankName,
                amount: body.amount,
                fee,
              },
            },
          });

          // create a debit transaction
          await trx.transaction.create({
            data: {
              walletId: fromWallet.id,
              transactionRef: this.generateTransactionRef('DEBIT'),
              type: TRANSACTION_TYPE.DEBIT,
              currency: body.currency,
              status: TRANSACTION_STATUS.success,
              description: body.description,
              previousBalance: fromWallet?.balance,
              currentBalance: fromWalletNewBalance,
              transferDetails: {
                senderName: fromWallet?.accountName,
                senderAccountNumber: fromWallet?.accountNumber,
                senderBankName: fromWallet?.bankName,
                beneficiaryName: toWallet?.accountName,
                beneficiaryAccountNumber: toWallet?.accountNumber,
                beneficiaryBankName: toWallet?.bankName,
                amount: body.amount,
                fee,
              },
            },
          });
        },
        {
          isolationLevel: 'Serializable',
          timeout: 20000,
        },
      );
    } else {
      let response: any;
      try {
        response = await this.apiProvider.transferFund(body);
      } catch (error) {
        console.log('error initiating transfer', error);

        if (error.response?.status == 400)
          throw new BadRequestException(error?.response?.data?.message);

        throw error;
      }
      const data = response?.data;

      await this.prisma.$transaction(
        async (trx) => {
          // lock from wallet for updates
          const lockfromWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid FOR UPDATE LIMIT 1`;

          fromWalletNewBalance = await this.deductBalance(
            lockfromWallet[0],
            amountPaid,
            trx,
          );

          // create a debit transaction
          await trx.transaction.create({
            data: {
              walletId: fromWallet.id,
              transactionRef: this.generateTransactionRef('DEBIT'),
              type: TRANSACTION_TYPE.DEBIT,
              currency: body.currency,
              description: body.description,
              previousBalance: fromWallet?.balance,
              currentBalance: fromWalletNewBalance,
              reference: data?.reference,
              transferDetails: {
                senderName: fromWallet?.accountName,
                senderAccountNumber: fromWallet?.accountNumber,
                senderBankName: fromWallet?.bankName,
                beneficiaryName: data?.full_name,
                beneficiaryAccountNumber: data?.account_number,
                beneficiaryBankName: data?.bank_name,
                amount: body.amount,
                fee,
              },
            },
          });
        },
        {
          isolationLevel: 'Serializable',
        },
      );
    }

    return {
      message: 'Transfer initiated successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async transferSafeHavenFund(
    body: TransferDto,
    user: User & { wallet?: any },
  ) {
    if (!user?.isWalletPinSet)
      throw new BadRequestException('Wallet pin not set');

    const isMatched = await bcrypt.compare(body?.walletPin, user?.walletPin);

    if (!isMatched) throw new BadRequestException('Incorect pin');

    // check if the account is restricted
    if (user?.status === USER_ACCOUNT_STATUS.restricted)
      throw new NotAcceptableException(
        'Your account has been restricted. Please contact support for assistance.',
      );

    // check for minimum amount to transfer
    this.checkforMinimumAndMaximumAmount(body.currency, body.amount, user);

    const toWallet = await this.prisma.wallet.findFirst({
      where: {
        accountNumber: body.accountNumber,
        currency: body.currency,
      },
    });

    const fromWallet = await this.prisma.wallet.findFirst({
      where: {
        userId: user?.id,
        currency: body.currency,
      },
    });

    if (!fromWallet)
      throw new NotFoundException(
        `Wallet of ${body.currency} not created, please create a wallet to initiate a transfer`,
      );

    if (fromWallet?.id === toWallet?.id)
      throw new BadRequestException('Enter a valid account number');

    if (body.amount > fromWallet?.balance)
      throw new BadRequestException('Insufficient Funds');

    let fee: any;

    // check for 10 free transactions and aggregate the total transaction amount for the current day
    const [trxCount, totalDebitTransferAmount] = await Promise.all([
      this.prisma.transaction.count({
        where: {
          walletId: user?.wallet?.id,
          category: TRANSACTION_CATEGORY.TRANSFER,
        },
      }),
      this.prisma.$queryRaw<{ total: number }[]>`
          SELECT SUM(("transferDetails"->>'amount')::numeric) AS total
          FROM transaction
          WHERE "walletId" = ${user?.wallet?.id}::uuid
            AND category = 'TRANSFER'
            AND type = 'DEBIT'
            AND status = 'success'
            AND DATE("createdAt") = CURRENT_DATE; -- Assuming "createdAt" is the timestamp column
        `,
    ]);

    const totalAmount = totalDebitTransferAmount[0]?.total || 0;

    console.log('totalAmount of transaction', totalAmount);

    if (totalAmount > user?.dailyCummulativeTransactionLimit)
      throw new BadRequestException(
        `You have exceeded your daily transaction limit of ${user?.dailyCummulativeTransactionLimit}. Please wait until the next day or upgrade your account to increase your limit.`,
      );

    fee =
      trxCount <= 10
        ? 0
        : toWallet
          ? 0
          : this.getTransferFee(body.currency, body.amount);

    if (body.fee && body.fee !== fee) {
      throw new BadRequestException('Incorrect transfer fee');
    }

    const amountPaid = body.amount + fee;

    //initiate transfer route
    try {
      const trx_ref = this.generateTransactionRef('CREDIT');
      const res = await this.apiProvider.transferSafeHavenFund(
        { ...body, amount: amountPaid },
        trx_ref,
      );

      console.log('response from transfer', res);

      if (res?.statusCode !== 200)
        throw new BadRequestException('Failed to transfer');

      const transferData = res?.data;
      await this.prisma.$transaction(
        async (trx) => {
          // lock from wallet for updates
          const lockfromWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid FOR UPDATE LIMIT 1`;

          const fromWalletNewBalance = await this.deductBalance(
            lockfromWallet[0],
            amountPaid,
            trx,
          );

          // create a debit transaction
          await trx.transaction.create({
            data: {
              walletId: fromWallet.id,
              transactionRef: this.generateTransactionRef('DEBIT'),
              type: TRANSACTION_TYPE.DEBIT,
              currency: body.currency,
              status: TRANSACTION_STATUS.success,
              description: body.description,
              previousBalance: fromWallet?.balance,
              currentBalance: fromWalletNewBalance,
              transferDetails: {
                senderName: fromWallet?.accountName,
                senderAccountNumber: fromWallet?.accountNumber,
                senderBankName: fromWallet?.bankName,
                beneficiaryName: transferData?.creditAccountName,
                beneficiaryAccountNumber: transferData?.creditAccountNumber,
                beneficiaryBankName: transferData?.destinationInstitutionCode,
                amount: body.amount,
                amountPaid,
                fee,
              },
            },
          });
        },
        {
          isolationLevel: 'Serializable',
          timeout: 20000,
        },
      );
    } catch (error) {
      console.log('error transfering fund', error);
      throw new BadRequestException('Failed to transfer');
    }

    return {
      message: 'Transfer initiated successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async verifyAccount(body: VerifyAccountDto) {
    let data: any;

    try {
      data = await this.apiProvider.verifyAccount(
        body.accountNumber,
        body.bankCode ?? defaultBankCode,
      );
    } catch (error) {
      if (error?.response?.status === 400)
        throw new BadRequestException('Enter a valid account details');

      throw error;
    }

    return {
      message: 'Account details retrieve successfully',
      statusCode: 200,
      data: data?.data,
    };
  }

  async generateQrCode(user: User & { wallet?: any }, amount: number) {
    // verify account number to get the sessionId
    let data: any;
    try {
      data = await this.apiProvider.verifyAccount(
        user?.wallet?.accountNumber,
        defaultBankCode,
      );
    } catch (error) {
      console.log('error verifying account number', error);
      throw new BadRequestException('Failed to verify account number');
    }

    // transfer details data
    const transferData = {
      bankCode: defaultBankCode,
      accountNumber: user?.wallet?.accountNumber,
      currency: user?.wallet?.currency,
      fee: 0,
      amount: Number(amount),
      sessionId: data?.data?.sessionId,
    };

    // stringify the transfer details
    const qrData = JSON.stringify(transferData);

    let qrCode: any;
    try {
      // encode the transfer details to base64 qrCode
      qrCode = await QRCode.toDataURL(qrData);
    } catch (error) {
      console.log('error', error);
      throw new InternalServerErrorException(
        `Failed to generate QR code: ${error.message}`,
      );
    }

    return {
      message: 'Qrcode generated successfully',
      statusCode: 200,
      data: qrCode,
    };
  }

  async decodeQrCode(qrCode: string) {
    const image = await Jimp.read(qrCode);

    const { data, width, height } = image.bitmap;
    const code = jsQR(new Uint8ClampedArray(data), width, height);

    if (!code) {
      throw new Error('QR Code could not be decoded.');
    }

    return {
      message: 'QR Code decoded successfully',
      statusCode: 200,
      data:
        typeof code?.data === 'string' ? JSON.parse(code?.data) : code?.data,
    };
  }

  async deductBalance(
    wallet: Wallet,
    amount: number,
    trx: Prisma.TransactionClient,
  ) {
    const newBalance = wallet?.balance - amount;

    console.log('walle id', wallet.id);
    await trx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: newBalance,
      },
    });
    return newBalance;
  }

  async addbalance(
    wallet: Wallet,
    amount: number,
    trx: Prisma.TransactionClient,
  ) {
    const newBalance = wallet.balance + amount;

    await trx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: newBalance,
      },
    });

    return newBalance;
  }

  private checkforMinimumAndMaximumAmount(
    currency: string,
    amount: number,
    user: User,
  ) {
    switch (currency) {
      case 'NGN':
        // check minimum amount
        if (amount < 50)
          throw new BadRequestException('Minimun amount for transfer is 50');

        // check maximum amount
        if (amount > user?.dailyCummulativeTransactionLimit)
          throw new BadRequestException(
            `You cannot transfer more than ${user?.dailyCummulativeTransactionLimit} due to the tier level of your account. Please upgrade your account to increase your transfer limits.`,
          );
        break;
      default:
        if (amount < 500)
          throw new BadRequestException('Minimun amount for transfer is 500');
    }
  }

  private getTransferFee(currency: string, amount: number) {
    switch (currency) {
      case 'NGN':
        if (amount < 500) {
          return 0;
        } else if (amount >= 500 && amount <= 20000) {
          return 20;
        } else if (amount > 20000 && amount <= 60000) {
          return 30;
        } else if (amount > 60000 && amount <= 100000) {
          return 100;
        } else if (amount > 100000 && amount <= 500000) {
          return 150;
        } else {
          return 200;
        }
      default:
        return amount;
    }
  }

  private generateTransactionRef(type: string) {
    const prefix = type === 'CREDIT' ? 'credit_' : 'debit_';
    const uniqueId = uuidv4(); // Generate a unique UUID
    return `${prefix}${uniqueId}`;
  }

  async initiateBvnVerification(body: InitiateBvnVerificationDto) {
    const response =
      await this.apiProvider.initiateSafeHavenBvnVerification(body);

    return {
      message: 'Bvn verification initiated successfully',
      statusCode: 200,
      data: { verificationId: response?.data?._id, bvn: body.bvn },
    };
  }

  async validateBvnVerification(body: ValidateBvnVerificationDto, user: User) {
    let bvnLookupRes: any;
    try {
      bvnLookupRes = await this.apiProvider.bvnLookUp(body?.bvn);
    } catch (error) {
      throw new BadRequestException('Failed to validate BVN');
    }

    if (!bvnLookupRes?.entity?.phone_number) {
      throw new BadRequestException('Failed to validate BVN');
    }

    let newWallet: any;
    if (true) {
      const res: any = await this.apiProvider.createVirtualAccount(
        body.bvn,
        {
          ...user,
          phoneNumber:
            bvnLookupRes?.entity?.phone_number ??
            bvnLookupRes?.entity?.phone_number1 ??
            bvnLookupRes?.entity?.phone_number2,
        },
        body?.verificationId,
        body?.otpCode,
      );

      if (res?.statusCode !== 200) {
        throw new BadRequestException('Failed to create account');
      }

      // update the user
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isBvnVerified: true,
          bvn: body.bvn,
          tierLevel: TIER_LEVEL.one,
          dailyCummulativeTransactionLimit:
            TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
          cummulativeBalanceLimit: TIER_ONE_COMMULATIVE_BALANCE_LIMIT,
        },
      });

      // create new wallet
      newWallet = await this.prisma.wallet.create({
        data: {
          userId: user.id,
          accountName: res?.account_name,
          bankName: res?.bank_name,
          accountNumber: res?.account_number,
          accountRef: res?.order_ref,
        },
      });
    }

    return {
      message: 'Wallet created succesfully',
      statusCode: 200,
      data: newWallet,
    };
  }
}
