import {
  BadRequestException,
  ConflictException,
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
  BENEFICIARY_TYPE,
  CURRENCY,
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
  BUSINESS_TIER_ONE_CUMMULATIVE_BALANCE_LIMIT,
  BUSINESS_TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
  CONCURRENT_BASE_DELAY,
  CONCURRENT_MAX_RETRIES,
  defaultBankCode,
  defaultBankName,
  TIER_ONE_CUMMULATIVE_BALANCE_LIMIT,
  TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
} from 'src/constants';
import * as bcrypt from 'bcrypt';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import { EmailService } from 'src/email/email.service';
import { getSMSAlertMessage } from 'src/utils';
import { SmileIdBasicKycPayload } from 'src/api-providers/providers/smile-id.service';
import { PushNotificationService } from 'src/notifications/notifications.service';

import { OmitType } from '@nestjs/swagger';
import { VerifyTestBvn } from './dto/VerifyTestBvnDto';

interface VerifyAccountResponseType {
  data: {
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bank: string;
    bvn: string;
    message: null;
    destinationInstitutionCode: string;
    kycLevel: string;
    sessionID: string;
    transactionId: string;
    bankVerificationNumber: string;
    responseCode: string;
    channelCode: string;
    channel: string;
  };
}
@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiProvider: ApiProviderService,
    private readonly emailService: EmailService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async getAllBanks() {
    const banks: any = await this.apiProvider.getAllBanks();

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
    user: User & { wallet?: Wallet[] }, // Note: wallet is an array
  ) {
    let response: any;

    if (!user?.wallet?.length) {
      throw new NotFoundException('No wallets found for this user');
    }

    // Get all wallet IDs for the user
    const userWalletIds = user.wallet.map((w) => w.id);

    // Build where clause with required walletId and optional filters
    const whereClause: Prisma.TransactionWhereInput = {
      walletId: {
        in: userWalletIds, // Use IN operator to match any of user's wallet IDs
      },
      ...(type && { type }),
      ...(category && { category }),
      ...(status && { status }),
      ...(search && { transactionRef: { contains: search } }),
    };

    if (page && limit) {
      const skip = (page - 1) * limit;

      const [transactions, totalCount] = await Promise.all([
        this.prisma.transaction.findMany({
          skip,
          take: Number(limit),
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          include: {
            wallet: true, // Include wallet details if needed
          },
        }),
        this.prisma.transaction.count({
          where: whereClause,
        }),
      ]);

      response = {
        transactions,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        itemsPerPage: limit,
      };
    } else {
      const transactions = await this.prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true, // Include wallet details if needed
        },
      });

      response = {
        transactions,
      };
    }

    console.log('response', response);

    return {
      message: 'Transactions retrieved successfully',
      statusCode: HttpStatus.OK,
      ...response,
    };
  }

  // async getTransactions(
  //   page: number,
  //   limit: number,
  //   type: TRANSACTION_TYPE,
  //   category: TRANSACTION_CATEGORY,
  //   status: TRANSACTION_STATUS,
  //   search: string,
  //   user: User & { wallet?: Wallet[] },
  // ) {
  //   let response: any;
  //   if (page && limit) {
  //     const skip = (page - 1) * limit;

  //     console.log(user, type, category, status, search);

  //     const [transactions, totalCount] = await Promise.all([
  //       this.prisma.transaction.findMany({
  //         skip,
  //         take: Number(limit),
  //         where: {
  //           walletId: user?.wallet?.id,
  //           type,
  //           category,
  //           status,
  //           transactionRef: search,
  //         },
  //         orderBy: { createdAt: 'desc' },
  //       }),
  //       this.prisma.transaction.count({
  //         where: {
  //           walletId: user?.wallet?.id,
  //           type,
  //           category,
  //           status,
  //           transactionRef: search,
  //         },
  //       }),
  //     ]);

  //     response = {
  //       transactions,
  //       totalCount,
  //       totalPages: Math.ceil(totalCount / limit),
  //     };
  //   } else {
  //     const transactions = await this.prisma.transaction.findMany({
  //       where: {
  //         walletId: user?.wallet?.id,
  //         type,
  //         category,
  //       },
  //       orderBy: { createdAt: 'desc' },
  //     });

  //     response = {
  //       transactions,
  //     };
  //   }

  //   return {
  //     message: 'Transactions retrieve successfully',
  //     statusCode: HttpStatus.OK,
  //     ...response,
  //   };
  // }

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
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid AND currency::text = ${body.currency.toString()} FOR UPDATE LIMIT 1`;

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
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid AND currency::text = ${body.currency.toString()} FOR UPDATE LIMIT 1`;

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
    if (
      user?.status === USER_ACCOUNT_STATUS.restricted ||
      user?.status === USER_ACCOUNT_STATUS.frozen
    )
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
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid AND currency::text = ${body.currency.toString()} FOR UPDATE LIMIT 1`;

          const lockToWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${toWallet.id}::uuid AND currency::text = ${body.currency.toString()} FOR UPDATE LIMIT 1`;

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
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid AND currency::text = ${body.currency.toString()} FOR UPDATE LIMIT 1`;

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

  async bellBankIntraTransfer(
    fromWallet: Wallet,
    toWallet: Wallet,
    amountPaid: number,
    body: TransferDto,
    user: User & { wallet?: Wallet },
    fee: number,
    currency: CURRENCY,
  ) {
    const MAX_RETRIES = CONCURRENT_MAX_RETRIES;
    const BASE_DELAY = CONCURRENT_BASE_DELAY;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await this.prisma.$transaction(async (trx) => {
          const lockfromWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid AND currency::text = ${currency.toString()} FOR UPDATE SKIP LOCKED LIMIT 1`;

          const locktoWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${toWallet.id}::uuid AND currency::text = ${currency.toString()} FOR UPDATE SKIP LOCKED LIMIT 1`;

          // check if beneficiary is to be added
          if (body?.addBeneficiary) {
            // check if that account number has been added before
            const beneficiary = await trx.beneficiary.findFirst({
              where: {
                userId: user?.id,
                accountNumber: body?.accountNumber,
              },
            });

            if (!beneficiary) {
              // add beneficiary
              await trx.beneficiary.create({
                data: {
                  userId: user?.id,
                  type: BENEFICIARY_TYPE.TRANSFER,
                  bankCode: body?.bankCode,
                  accountNumber: body?.accountNumber,
                  bankName: defaultBankName,
                  accountName: toWallet.accountName,
                },
              });
            }
          }

          const [fromWalletNewBalance, toWalletNewBalance] = await Promise.all([
            this.deductBalance(lockfromWallet[0], amountPaid, trx),
            this.addbalance(locktoWallet[0], body.amount, trx),
          ]);

          const debitTrxRef = this.generateTransactionRef('DEBIT');
          const creditTrxRef = this.generateTransactionRef('CREDIT');

          await Promise.all([
            // create a debit transaction for fromWallet
            trx.transaction.create({
              data: {
                walletId: fromWallet.id,
                transactionRef: debitTrxRef,
                type: TRANSACTION_TYPE.DEBIT,
                currency: body.currency,
                status: TRANSACTION_STATUS.success,
                description: body.description,
                previousBalance: fromWallet?.balance,
                currentBalance: fromWalletNewBalance,
                transferDetails: {
                  senderName: fromWallet?.accountName,
                  senderAccountNumber: fromWallet?.accountNumber,
                  senderBankName: defaultBankName,
                  beneficiaryName: toWallet?.accountName,
                  beneficiaryAccountNumber: toWallet?.accountNumber,
                  beneficiaryBankName: defaultBankName,
                  amount: body.amount,
                  amountPaid,
                  fee,
                },
              },
            }),

            //create a credit transaction for toWallet
            trx.transaction.create({
              data: {
                walletId: toWallet.id,
                transactionRef: creditTrxRef,
                type: TRANSACTION_TYPE.CREDIT,
                category: TRANSACTION_CATEGORY.DEPOSIT,
                currency: body.currency,
                status: TRANSACTION_STATUS.success,
                description: body.description,
                previousBalance: toWallet?.balance,
                currentBalance: toWalletNewBalance,
                depositDetails: {
                  senderName: fromWallet?.accountName,
                  senderAccountNumber: fromWallet?.accountNumber,
                  senderBankName: defaultBankName,
                  beneficiaryName: toWallet?.accountName,
                  beneficiaryAccountNumber: toWallet?.accountNumber,
                  beneficiaryBankName: defaultBankName,
                  amount: body.amount,
                  amountPaid,
                  fee,
                },
              },
            }),
          ]);

          const RAccountNumber = toWallet.accountNumber;
          const SAccountNUmber = fromWallet.accountNumber;
          const maskedRAccountNumber = `${RAccountNumber.substring(0, 2)}xxx..${RAccountNumber.substring(RAccountNumber.length - 4, RAccountNumber.length - 1)}x`;
          const maskedSAccountNumber = `${SAccountNUmber.substring(0, 2)}xxx..${SAccountNUmber.substring(SAccountNUmber.length - 4, SAccountNUmber.length - 1)}x`;

          try {
            //send debit alert email
            const amount = new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(Number(body.amount.toFixed(2)));

            const now = new Date();
            const formattedDate = now.toLocaleString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });

            //send debit email alert
            this.emailService.sendEmail({
              to: user.email,
              subject: 'Debit Alert',
              template: 'user/debit.hbs',
              context: {
                amount,
                accountName: fromWallet.accountName
                  .split('/')[1]
                  .split(' ')
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() +
                      word.slice(1).toLowerCase(),
                  )
                  .join(' '),
                accountNumber: maskedRAccountNumber,
                dateAndTime: formattedDate,
                receipientName: toWallet?.accountName,
                reference: debitTrxRef,
                narration: body.description || '',
                availableBalance: new Intl.NumberFormat('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(Number(fromWalletNewBalance.toFixed(2))),
                year: new Date().getFullYear(),
              },
            });

            //send debit sms alert
            this.apiProvider.sendSms(
              user.phoneNumber,
              getSMSAlertMessage(
                amount,
                toWallet?.accountName,
                fromWallet?.accountName,
                debitTrxRef,
                formattedDate,
                Number(fromWalletNewBalance.toFixed(2)),
                'transfer',
                {
                  isCredit: false,
                },
                maskedSAccountNumber,
                maskedRAccountNumber,
                toWallet.bankName.toUpperCase(),
              ),
              'sendar',
            );
          } catch (error) {
            console.log('Error sending debit transfer alert', error);
          }

          try {
            //send credit alert email
            const amount = new Intl.NumberFormat('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(body.amount);

            const now = new Date();
            const formattedDate = now.toLocaleString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });

            //send credit email alert
            this.emailService.sendEmail({
              to: user.email,
              subject: 'Credit Alert',
              template: 'user/credit.hbs',
              context: {
                amount,
                accountName: toWallet.accountName
                  .split('/')[1]
                  .split(' ')
                  .map(
                    (word) =>
                      word.charAt(0).toUpperCase() +
                      word.slice(1).toLowerCase(),
                  )
                  .join(' '),
                accountNumber: maskedRAccountNumber,
                dateAndTime: formattedDate,
                senderName: fromWallet?.accountName,
                reference: creditTrxRef,
                narration: body.description || '',
                availableBalance: new Intl.NumberFormat('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(toWalletNewBalance),
                year: new Date().getFullYear(),
              },
            });

            //send credit sms alert
            this.apiProvider.sendSms(
              user.phoneNumber,
              getSMSAlertMessage(
                amount,
                toWallet?.accountName,
                fromWallet?.accountName,
                creditTrxRef,
                formattedDate,
                Number(toWalletNewBalance.toFixed(2)),
                'transfer',
                {
                  isCredit: true,
                },
                maskedSAccountNumber,
                maskedRAccountNumber,
                fromWallet.bankName.toLowerCase(),
              ),
              'sendar',
            );
          } catch (error) {
            console.log('Error sending credit transfer alert', error);
          }

          try {
            // Send push notification to sender (debit notification)
            await this.pushNotificationService.sendTransferCompletedNotification(
              user.id,
              body.amount,
              toWallet.accountName,
              debitTrxRef,
            );

            // Send push notification to recipient (credit notification)
            // Get recipient user ID from toWallet
            const recipientUser = await trx.user.findFirst({
              where: {
                wallet: {
                  some: {
                    id: toWallet.id,
                  },
                },
              },
            });

            if (recipientUser) {
              await this.pushNotificationService.sendIncomingTransferNotification(
                recipientUser.id,
                body.amount,
                fromWallet.accountName,
                creditTrxRef,
              );
            }
          } catch (error) {
            console.log('Error sending push notifications:', error);
            // Don't throw error - push notification failure shouldn't fail the transfer
          }
        });

        return {
          message: 'Transfer initiated successfully',
          statusCode: HttpStatus.OK,
        };
      } catch (error) {
        if (
          (error.code === 'P2034' || error.code === 'P40001') &&
          attempt < MAX_RETRIES - 1
        ) {
          // Exponential backoff with jitter
          const delay =
            Math.min(
              BASE_DELAY * Math.pow(2, attempt),
              5000, // Max delay of 5 seconds
            ) +
            Math.random() * 100;

          console.log(
            `Serialization failure on attempt ${attempt + 1}. Retrying in ${delay}ms...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Create failed transfer transaction
        await this.prisma.transaction.create({
          data: {
            walletId: user.wallet.id,
            transactionRef: this.generateTransactionRef('DEBIT'),
            type: TRANSACTION_TYPE.DEBIT,
            currency: body.currency,
            status: TRANSACTION_STATUS.failed,
            previousBalance: user.wallet.balance,
            currentBalance: user.wallet.balance,
            transferDetails: {
              senderName: fromWallet?.accountName,
              senderAccountNumber: fromWallet?.accountNumber,
              senderBankName: defaultBankName,
              beneficiaryName: toWallet?.accountName,
              beneficiaryAccountNumber: toWallet?.accountNumber,
              beneficiaryBankName: defaultBankName,
              amount: body.amount,
              amountPaid,
              fee,
            },
          },
        });

        // Log and rethrow other errors
        console.error('Transaction failed:', error);
        throw new InternalServerErrorException(
          'Transaction service temporarily unavailable. Please retry shortly.',
        );
      }
    }

    throw new InternalServerErrorException('Transfer processing failed');
  }

  async bellBankInterTransfer(
    fromWallet: Wallet,
    amountPaid: number,
    body: TransferDto,
    user: User & { wallet?: Wallet },
    fee: number,
    currency: CURRENCY,
  ) {
    const MAX_RETRIES = CONCURRENT_MAX_RETRIES;
    const BASE_DELAY = CONCURRENT_BASE_DELAY;

    const trxRef = this.generateTransactionRef('DEBIT');
    const senderName = user.wallet.accountName;
    let beneficiaryBankName: any;
    let transferData: any;
    let pendingTransactionId: string;
    let fromWalletNewBalance: number;

    try {
      // create a pending transaction
      await this.prisma.$transaction(
        async (trx) => {
          console.log('before currency', currency);
          const lockfromWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid AND currency::text = ${currency.toString()} FOR UPDATE SKIP LOCKED LIMIT 1`;

          console.log('after currency');
          if (!lockfromWallet.length || !lockfromWallet[0]) {
            throw new ConflictException(
              'Unable to access wallet at this time, please try again',
            );
          }

          [fromWalletNewBalance, beneficiaryBankName] = await Promise.all([
            this.deductBalance(lockfromWallet[0], amountPaid, trx),
            this.apiProvider.getSafeHavenBankName(body?.bankCode),
          ]);

          //create a pending transaction
          const pendingTrx = await trx.transaction.create({
            data: {
              walletId: fromWallet.id,
              transactionRef: trxRef,
              type: TRANSACTION_TYPE.DEBIT,
              currency: body.currency,
              status: TRANSACTION_STATUS.pending,

              description: body.description,
              previousBalance: fromWallet?.balance,
              currentBalance: fromWalletNewBalance,
              transferDetails: {
                senderName: fromWallet?.accountName,
                senderAccountNumber: fromWallet?.accountNumber,
                senderBankName: fromWallet?.bankName,
                beneficiaryName: transferData?.destinationAccountName,
                beneficiaryAccountNumber:
                  transferData?.destinationAccountNumber,
                beneficiaryBankName,
                amount: body.amount,
                amountPaid,
                fee,
              },
            },
          });

          pendingTransactionId = pendingTrx.id;
        },
        {
          isolationLevel: 'Serializable',
          timeout: 10000,
        },
      );
    } catch (error) {
      console.log('Error initiating transfer', error);
      throw new InternalServerErrorException(
        'Service temporarily unavailable. Please retry shortly.',
      );
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await this.apiProvider.transferBellBankFund(
          { ...body, amount: amountPaid },
          fromWallet.accountName,
          trxRef,
        );

        if (res?.success === false) {
          throw new InternalServerErrorException('Transfer processing failed');
        }

        transferData = res?.data;
        // check if beneficiary is to be added
        if (body?.addBeneficiary) {
          // check if that account number has been added before
          const beneficiary = await this.prisma.beneficiary.findFirst({
            where: {
              userId: user?.id,
              accountNumber: body?.accountNumber,
            },
          });

          if (!beneficiary) {
            // add beneficiary
            await this.prisma.beneficiary.create({
              data: {
                userId: user?.id,
                type: BENEFICIARY_TYPE.TRANSFER,
                bankCode: body?.bankCode,
                accountNumber: body?.accountNumber,
                bankName: beneficiaryBankName,
                accountName: transferData?.destinationAccountName,
              },
            });
          }
        }

        // update transaction
        await this.prisma.transaction.update({
          where: {
            id: pendingTransactionId,
          },
          data: {
            status: TRANSACTION_STATUS.success,
            transferDetails: {
              senderName: fromWallet?.accountName,
              senderAccountNumber: fromWallet?.accountNumber,
              senderBankName: fromWallet?.bankName,
              beneficiaryName: transferData?.destinationAccountName,
              beneficiaryAccountNumber: transferData?.destinationAccountNumber,
              beneficiaryBankName,
              amount: body.amount,
              amountPaid,
              fee: transferData?.charge,
            },
          },
        });

        try {
          //send debit alert email
          const RAccountNumber = transferData?.destinationAccountNumber;
          const SAccountNumber = fromWallet.accountNumber;
          const maskedRAccountNumber = `${RAccountNumber.substring(0, 2)}xxx..${RAccountNumber.substring(RAccountNumber.length - 4, RAccountNumber.length - 1)}x`;
          const maskedSAccountNumber = `${SAccountNumber.substring(0, 2)}xxx..${SAccountNumber.substring(SAccountNumber.length - 4, SAccountNumber.length - 1)}x`;

          const amount = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(Number(body.amount.toFixed(2)));

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
          console.log('from wallet', fromWallet.accountName);

          this.emailService.sendEmail({
            to: user.email,
            subject: 'Debit Alert',
            template: 'user/debit.hbs',
            context: {
              amount,
              accountName: fromWallet.accountName,

              // accountName: fromWallet.accountName
              //   .split('/')[1]
              //   .split(' ')
              //   .map(
              //     (word) =>
              //       word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
              //   )
              //   .join(' '),
              accountNumber: maskedRAccountNumber,
              dateAndTime: formattedDate,
              receipientName: transferData?.destinationAccountName,
              narration: body.description || '',
              reference: trxRef,
              availableBalance: new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(fromWalletNewBalance),
              year: new Date().getFullYear(),
            },
          });

          //send debit sms alert
          this.apiProvider.sendSms(
            user.phoneNumber,
            getSMSAlertMessage(
              amount,
              transferData?.destinationAccountName,
              fromWallet?.accountName,
              trxRef,

              formattedDate,
              Number(fromWalletNewBalance.toFixed(2)),
              'transfer',
              {
                isCredit: false,
                description: body.description || '', // Add description here
              },
              maskedSAccountNumber,
              maskedRAccountNumber,
              beneficiaryBankName.toUpperCase(),
            ),
            'sendar',
          );
        } catch (error) {
          console.log('Error sending transfer alert', error);
        }

        try {
          // ... existing email and SMS alert logic ...

          // Send push notification for successful inter-bank transfer
          await this.pushNotificationService.sendTransferCompletedNotification(
            user.id,
            body.amount,
            transferData?.destinationAccountName,
            trxRef,
          );
        } catch (error) {
          console.log(
            'Error sending transfer alert or push notification:',
            error,
          );
        }

        return {
          message: 'Transfer initiated successfully',
          statusCode: HttpStatus.OK,
        };
      } catch (error) {
        // Handle specific Prisma transaction conflict errors
        if (
          (error.code === 'P2034' || error.code === 'P40001') &&
          attempt < MAX_RETRIES - 1
        ) {
          // Exponential backoff with jitter
          const delay =
            Math.min(
              BASE_DELAY * Math.pow(2, attempt),
              5000, // Max delay of 5 seconds
            ) +
            Math.random() * 100;

          console.log(
            `Serialization failure on attempt ${attempt + 1}. Retrying in ${delay}ms...`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // update the trx to failed
        await this.prisma.transaction.update({
          where: {
            id: pendingTransactionId,
          },
          data: {
            status: TRANSACTION_STATUS.failed,
            currentBalance: fromWalletNewBalance - body.amount,
          },
        });

        // refund's  user wallet
        await this.prisma.$transaction(async (trx) => {
          const lockfromWallet: Wallet[] =
            await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${fromWallet.id}::uuid AND currency::text = ${currency.toString()} FOR UPDATE SKIP LOCKED LIMIT 1`;

          if (!lockfromWallet.length || !lockfromWallet[0]) {
            throw new ConflictException(
              'Unable to access wallet at this time, please try again',
            );
          }

          await this.addbalance(lockfromWallet[0], amountPaid, trx);
        });

        // Log and rethrow other errors
        console.error('Transaction failed:', error);
        throw new InternalServerErrorException('Transfer processing failed');
      }
    }
    throw new InternalServerErrorException('Transfer processing failed');
  }

  async transferBellBankFund(
    body: TransferDto,
    user: User & { wallet?: Wallet },
  ) {
    // if (!user?.isWalletPinSet)
    //   throw new BadRequestException('Wallet pin not set');

    // console.log(user?.walletPin, body?.walletPin);

    // const isMatched = await bcrypt.compare(body?.walletPin, user?.walletPin);

    // if (!isMatched) throw new BadRequestException('Incorect pin');

    if (!user?.isWalletPinSet && !user?.biometricCredential) {
      throw new BadRequestException('No authentication method set');
    }

    // Verify authentication method
    if (body.walletPin) {
      // Verify wallet PIN
      const isMatched = await bcrypt.compare(body.walletPin, user?.walletPin);
      if (!isMatched) {
        throw new BadRequestException('Incorrect PIN');
      }
    } else if (body.biometricKey) {
      // Verify biometric key
      if (body.biometricKey !== user.biometricCredential) {
        throw new BadRequestException('Invalid biometric authentication');
      }
    } else {
      throw new BadRequestException(
        'Either wallet PIN or biometric key is required',
      );
    }

    // check if the account is restricted
    if (
      user?.status === USER_ACCOUNT_STATUS.restricted ||
      USER_ACCOUNT_STATUS.frozen
    )
      throw new NotAcceptableException(
        'Your account has been restricted. Please contact support for assistance.',
      );

    // check for minimum amount to transfer
    // this.checkforMinimumAndMaximumAmount(body.currency, body.amount, user);

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
      throw new BadRequestException(
        'Source and destination accounts must be different.',
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

    // console.log('totalAmount of transaction', totalAmount);

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

    const amountPaid = body.amount;

    if (toWallet) {
      return await this.bellBankIntraTransfer(
        fromWallet,
        toWallet,
        amountPaid,
        body,
        user,
        fee,
        body.currency,
      );
    }

    return await this.bellBankInterTransfer(
      fromWallet,
      amountPaid,
      body,
      user,
      fee,
      body.currency,
    );
  }

  async verifyAccount(body: VerifyAccountDto) {
    let data: VerifyAccountResponseType;

    try {
      data = await this.apiProvider.verifyAccount(
        body.accountNumber,
        body.bankCode,
        body.internal,
      );
    } catch (error) {
      if (error?.response?.status === 400)
        throw new BadRequestException('Enter a valid account details');

      throw error;
    }

    const resdata = data.data;

    const { bvn, bankVerificationNumber, ...transformedData } = resdata;

    return {
      message: 'Account details retrieve successfully',
      statusCode: 200,
      data: transformedData,
    };
  }

  async generateQrCode(
    user: User & { wallet?: Wallet[] },
    amount: number,
    currency: CURRENCY,
  ) {
    // verify account number to get the sessionId
    let data: any;
    const wallet = user?.wallet?.find((w: Wallet) => w.currency === currency);
    try {
      data = await this.apiProvider.verifyAccount(
        wallet?.accountNumber,
        defaultBankCode,
        true,
      );
    } catch (error) {
      console.log('error verifying account number', error);
      throw new BadRequestException('Failed to verify account number');
    }

    // transfer details data
    const transferData = {
      bankCode: defaultBankCode,
      accountNumber: wallet?.accountNumber,
      currency: wallet?.currency,
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

  async verifyTestBvn(body: VerifyTestBvn) {
    let bvnVerificationRes: any;
    try {
      bvnVerificationRes = await this.apiProvider.verifyBasicTestKyc(body);
    } catch (error) {
      throw new BadRequestException('Failed to validate BVN');
    }

    console.log('bvnVerificationRes', bvnVerificationRes);

    const exactMatchOnly = ['FirstName', 'LastName', 'Gender', 'Phone_Number'];
    const allowPartial = ['Names', 'ID_Verification'];
    const skipKeys = ['DOB']; // ignore DOB completely

    const actions = bvnVerificationRes?.Actions || {};
    const isValid = Object.entries(actions).every(([key, value]) => {
      if (skipKeys.includes(key)) return true; // ignore DOB
      if (
        value === 'Not Provided' ||
        value === 'Not Applicable' ||
        value === ''
      )
        return true;

      if (exactMatchOnly.includes(key)) {
        return value === 'Exact Match';
      }

      if (allowPartial.includes(key)) {
        return value === 'Exact Match' || value === 'Partial Match';
      }

      if (key === 'Verify_ID_Number') {
        return value === 'Verified';
      }

      // For other keys, default to requiring Exact Match
      return value === 'Exact Match';
    });

    if (!isValid) {
      throw new BadRequestException(
        'Failed to validate BVN - some fields did not match required rules',
      );
    }

    return {
      message: 'Bvn verification successful',
      statusCode: 200,
      data: bvnVerificationRes,
    };
  }

  async initiateBvnVerification(body: InitiateBvnVerificationDto, user: User) {
    let bvnVerificationRes: any;
    try {
      bvnVerificationRes = await this.apiProvider.verifyBasicKyc(user.id, body);
    } catch (error) {
      throw new BadRequestException('Failed to validate BVN');
    }

    console.log('bvnVerificationRes', bvnVerificationRes);

    console.log('bvnVerificationRes', bvnVerificationRes.ResultText);
    const validResults = ['Partial Match', 'Exact Match'];
    if (!validResults.includes(bvnVerificationRes?.ResultText)) {
      throw new BadRequestException('Failed to validate BVN');
    }

    //     const exactMatchOnly = ["FirstName", "LastName", "Phone_Number"];
    // const allowPartial = ["Names", "ID_Verification"];
    // const skipKeys = ["DOB", "Gender" ];

    // const actions = bvnVerificationRes?.Actions || {};
    // const isValid = Object.entries(actions).every(([key, value]) => {
    //   if (skipKeys.includes(key)) return true; // ignore DOB
    //   if (value === "Not Provided" || value === "Not Applicable" || value === "") return true;

    //   if (exactMatchOnly.includes(key)) {
    //     return value === "Exact Match";
    //   }

    //   if (allowPartial.includes(key)) {
    //     return value === "Exact Match" || value === "Partial Match";
    //   }

    //   if (key === "Verify_ID_Number") {
    //     return value === "Verified";
    //   }

    //   return value === "Exact Match";
    // });

    // if (!isValid) {
    //   throw new BadRequestException('Failed to validate BVN - some fields did not match required rules');
    // }

    let newWallet: any;

    let res: any;
    try {
      res = await this.apiProvider.createVirtualAccount(
        body.bvn,
        {
          ...user,
          phoneNumber: user.phoneNumber,
        },

        user?.isBusiness ? 'business' : 'personal',
      );
    } catch (error) {
      throw new BadRequestException('Failed to validate BVN');
    }

    // update the user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isBvnVerified: true,
        bvn: body.bvn,
        tierLevel: TIER_LEVEL.one,
        dailyCummulativeTransactionLimit: user.isBusiness
          ? BUSINESS_TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT
          : TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
        cummulativeBalanceLimit: user.isBusiness
          ? BUSINESS_TIER_ONE_CUMMULATIVE_BALANCE_LIMIT
          : TIER_ONE_CUMMULATIVE_BALANCE_LIMIT,
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

    return {
      message: 'Wallet created succesfully',
      statusCode: 201,
      data: newWallet,
    };

    // const response =
    //   await this.apiProvider.initiateSafeHavenBvnVerification(body);

    // return {
    //   message: 'Bvn verification initiated successfully',
    //   statusCode: 200,
    //   data: { verificationId: response?.data?._id, bvn: body.bvn },
    // };
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

    let res: any;
    try {
      res = await this.apiProvider.createVirtualAccount(
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
        body?.isBusiness ? 'business' : 'personal',
      );
    } catch (error) {
      throw new BadRequestException('Failed to validate BVN');
    }

    // update the user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isBvnVerified: true,
        bvn: body.bvn,
        tierLevel: TIER_LEVEL.one,
        dailyCummulativeTransactionLimit: body.isBusiness
          ? BUSINESS_TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT
          : TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
        cummulativeBalanceLimit: body.isBusiness
          ? BUSINESS_TIER_ONE_CUMMULATIVE_BALANCE_LIMIT
          : TIER_ONE_CUMMULATIVE_BALANCE_LIMIT,
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

    return {
      message: 'Wallet created succesfully',
      statusCode: 201,
      data: newWallet,
    };
  }
}
