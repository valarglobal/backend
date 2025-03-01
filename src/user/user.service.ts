import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { WalletPinDto } from './dto/WalletPinDto';
import {
  ACCOUNT_TYPE,
  BENEFICIARY_TYPE,
  BILL_TYPE,
  ScamTicket,
  TIER_LEVEL,
  Transaction,
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  User,
  Wallet,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ChangePinDto } from './dto/ChangePinDto';
import { ApiProviderService } from 'src/api-providers/api-providers.service';
import { ChangePasscodeDto } from './dto/ChangePasscodeDto';
import { EditProfileDto } from './dto/EditProfileDto';
import { ChangePasswordDto } from './dto/ChangePasswordDto';
import { ResetWalletPinDto } from './dto/ResetWalletPinDto';
import { EmailService } from 'src/email/email.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WalletEntity } from '../wallet/serializer/wallet.serializer';
import { plainToInstance } from 'class-transformer';
import { KycTier2Dto } from './dto/KycTier2Dto';
import { ReportScamDto } from './dto/ReportScamDto';
import {
  subDays,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  startOfWeek,
} from 'date-fns';

import {
  TIER_ONE_CUMMULATIVE_BALANCE_LIMIT,
  TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
  TIER_THREE_CUMMULATIVE_BALANCE_LIMIT,
  TIER_THREE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
  TIER_TWO_CUMMULATIVE_BALANCE_LIMIT,
  TIER_TWO_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
} from 'src/constants';
import { CreateBusinessAccountDto } from './dto/CreateBusinessAccountDto';
import { KycTier3Dto } from './dto/KycTier3Dto';
import { ValidatePhoneNumberDto } from './dto/validatePhoneNumberDto';
import { VerifyPhoneNumberDto } from './dto/verifyPhoneNumberDto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiProvider: ApiProviderService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async getBeneficiaries(
    category: BENEFICIARY_TYPE,
    transferType: string,
    billType: BILL_TYPE,
    user: User,
  ) {
    let result: any;
    if (category === BENEFICIARY_TYPE.TRANSFER) {
      if (transferType === 'intra') {
        // Get beneficiaries where the linked wallet has an accountName that starts with "NATTYPAYGLOBALS"
        result = await this.prisma.beneficiary.findMany({
          where: {
            userId: user.id,
            type: category,
            accountName: { startsWith: 'NATTYPAYGLOBALS' },
          },
        });
      } else if (transferType === 'inter') {
        // Get beneficiaries where the linked wallet does NOT have an accountName starting with "NATTYPAYGLOBALS"
        result = await this.prisma.beneficiary.findMany({
          where: {
            userId: user.id,
            type: category,
            NOT: {
              accountName: { startsWith: 'NATTYPAYGLOBALS' },
            },
          },
        });
      }
    } else {
      result = await this.prisma.beneficiary.findMany({
        where: { userId: user.id, type: category, billType },
      });
    }

    return {
      message: 'Beneficiary details retrieved successfully',
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  async getStatisticsLineChart(user: User & { wallet?: Wallet }) {
    const wallet = user?.wallet;

    const [creditTransactions, debitTransactions] = await Promise.all([
      // get all credit transaction for the last 7days
      this.prisma.transaction.findMany({
        where: {
          walletId: wallet?.id,
          type: TRANSACTION_TYPE.CREDIT,
          status: TRANSACTION_STATUS.success,
          createdAt: {
            gte: startOfDay(subDays(new Date(), 7)),
          },
        },
      }),

      // get all debit transactions for the last 7 days
      this.prisma.transaction.findMany({
        where: {
          walletId: wallet?.id,
          type: TRANSACTION_TYPE.DEBIT,
          status: TRANSACTION_STATUS.success,
          createdAt: {
            gte: startOfDay(subDays(new Date(), 7)),
          },
        },
      }),
    ]);

    // Helper to group transactions by date
    const groupByDate = (transactions: any[]) => {
      return transactions.reduce(
        (acc, transaction) => {
          const formattedDate = format(
            new Date(transaction.createdAt),
            'dd MMM',
          );

          if (!acc[formattedDate]) {
            acc[formattedDate] = 0;
          }
          acc[formattedDate] +=
            transaction?.billDetails?.amountPaid ??
            transaction?.transferDetails?.amountPaid ??
            transaction?.depositDetails?.amountPaid ??
            0; // Sum the amounts
          return acc;
        },
        {} as Record<string, number>,
      );
    };

    // Group credit and debit transactions by date
    const [creditGrouped, debitGrouped] = await Promise.all([
      Promise.resolve(groupByDate(creditTransactions)),
      Promise.resolve(groupByDate(debitTransactions)),
    ]);

    // Prepare an array for the last 7 days
    const last7Days = Array.from(
      { length: 7 },
      (_, i) => format(subDays(new Date(), i), 'dd MMM'), // Format to dd MMM
    ).reverse(); // Ensure it's sorted oldest to newest

    // Calculate cumulative totals
    let cumulativeEarnings = 0;
    let cumulativeDebits = 0;
    const result = last7Days.map((date, index) => {
      const dailyCredit = creditGrouped[date] || 0;
      const dailyDebit = debitGrouped[date] || 0;

      cumulativeEarnings += dailyCredit;
      cumulativeDebits += dailyDebit;

      return {
        id: index + 1,
        date,
        credits: cumulativeEarnings,
        debits: cumulativeDebits,
      };
    });

    return {
      message: 'Statistics retrieved successfully',
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  async getStatisticsPieChart(
    user: User & { wallet?: Wallet },
    sort: 'all' | 'today' | 'week' | 'month' | 'year',
  ) {
    let dateFilter: Date | undefined;

    switch (sort) {
      case 'today':
        dateFilter = startOfDay(new Date()); // Start of today
        break;
      case 'week':
        dateFilter = startOfWeek(new Date(), { weekStartsOn: 1 }); // Start of the current week (Monday)
        break;
      case 'month':
        dateFilter = startOfMonth(new Date()); // Start of the current month
        break;
      case 'year':
        dateFilter = startOfYear(new Date()); // Start of the current year
        break;
      case 'all':
        dateFilter = undefined; // No filter for all transactions
        break;
      default:
        throw new BadRequestException('Invalid sort parameter');
    }

    // Fetch transactions based on the filter
    const transactions = await this.prisma.transaction.findMany({
      where: {
        walletId: user.wallet.id,
        status: TRANSACTION_STATUS.success,
        ...(dateFilter && {
          createdAt: {
            gte: dateFilter,
          },
        }),
      },
    });

    function getCummulativeTotal(
      transactions: any[],
      category: TRANSACTION_CATEGORY,
    ) {
      let totalAmount = 0;

      if (category === TRANSACTION_CATEGORY.DEPOSIT) {
        totalAmount = transactions.reduce((acc, transaction) => {
          return acc + (transaction?.depositDetails?.amountPaid ?? 0);
        }, 0);
      } else if (category === TRANSACTION_CATEGORY.TRANSFER) {
        totalAmount = transactions.reduce((acc, transaction) => {
          return acc + (transaction?.transferDetails?.amountPaid ?? 0);
        }, 0);
      } else if (category === TRANSACTION_CATEGORY.BILL_PAYMENT) {
        totalAmount = transactions.reduce((acc, transaction) => {
          return acc + (transaction?.billDetails?.amountPaid ?? 0);
        }, 0);
      } else {
        throw new BadRequestException('Invalid transaction category');
      }

      return totalAmount;
    }

    const [totalDeposit, totalTransfer, totalBillPayment] = await Promise.all([
      Promise.resolve(
        getCummulativeTotal(transactions, TRANSACTION_CATEGORY.DEPOSIT),
      ),
      Promise.resolve(
        getCummulativeTotal(transactions, TRANSACTION_CATEGORY.TRANSFER),
      ),
      Promise.resolve(
        getCummulativeTotal(transactions, TRANSACTION_CATEGORY.BILL_PAYMENT),
      ),
    ]);

    const statsPieArray = [
      {
        id: 1,
        title: 'Total Deposit',
        value: totalDeposit,
        color: '#64D284',
      },
      {
        id: 2,
        title: 'Total transfers',
        value: totalTransfer,
        color: '#FF8D7D',
      },
      {
        id: 3,
        title: 'Total bill payment',
        value: totalBillPayment,
        color: '#C9A62A',
      },
    ];

    return {
      message: 'Statistics retrieved successfully',
      statusCode: HttpStatus.OK,
      data: statsPieArray,
    };
  }

  async setWalletPin(body: WalletPinDto, user: User) {
    const hashedPin = await bcrypt.hash(body.pin, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { walletPin: hashedPin, isWalletPinSet: true },
    });

    return {
      message: 'Your 4-digit wallet PIN has been set successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async verifyWalletPin(body: WalletPinDto, user: User) {
    if (!user?.isWalletPinSet)
      throw new BadRequestException('Wallet pin not set');

    const isMatched = await bcrypt.compare(body.pin, user?.walletPin);

    if (!isMatched) throw new BadRequestException('Incorect pin');

    return {
      message: 'Your 4-digit wallet PIN has been verified successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async verifyNinDetails(nin: string, user: User) {
    let res: any;
    try {
      res = await this.apiProvider.verifyNin(nin);
    } catch (error) {
      if (error?.response?.status === 400)
        throw new BadRequestException(error?.response?.data?.error);
      throw new BadRequestException('Invalid nin');
    }

    const firstName = user?.fullname.split(' ')[0].toLowerCase();
    const lastName = user?.fullname.split(' ')[1].toLowerCase();
    const data = res?.entity;

    if (
      data?.first_name.toLowerCase() !== firstName &&
      data?.first_name.toLowerCase() !== lastName
    ) {
      throw new BadRequestException(
        'The provided NIN does not match your first name or last name. Please verify your details and try again.',
      );
    }

    if (
      data?.last_name.toLowerCase() !== firstName &&
      data?.last_name.toLowerCase() !== lastName
    ) {
      throw new BadRequestException(
        'The provided NIN does not match your first name or last name. Please verify your details and try again.',
      );
    }

    // update nin verified status
    await this.prisma.user.update({
      where: {
        id: user?.id,
      },
      data: {
        nin,
        isNinVerified: true,
      },
    });

    return {
      message: 'Nin verified successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async changePin(body: ChangePinDto, user: User) {
    const isValidPin = await bcrypt.compare(body.oldPin, user.walletPin);
    if (!isValidPin) {
      throw new BadRequestException(
        'The PIN you entered does not match your current PIN. Please try again.',
      );
    }

    const hashedPin = await bcrypt.hash(body.newPin, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { walletPin: hashedPin },
    });

    return {
      message: 'Your 4-digit wallet PIN has been successfully updated',
      statusCode: HttpStatus.OK,
    };
  }

  async changePasscode(body: ChangePasscodeDto, user: User) {
    const isValidPasscode = await bcrypt.compare(
      body.oldPasscode,
      user.passcode,
    );
    if (!isValidPasscode) {
      throw new BadRequestException(
        'The Passcode you entered does not match your current Passcode. Please try again.',
      );
    }

    if (body.newPasscode === body.oldPasscode) {
      throw new BadRequestException(
        'New passcode cannot be the same as the old passcode',
      );
    }

    const hashedPasscode = await bcrypt.hash(body.newPasscode, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passcode: hashedPasscode },
    });

    return {
      message: 'Passcode updated successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async requestChangePassword(user: User) {
    const otpCode = this.generateOtp(6);

    const otpToken = await this.jwtService.signAsync(
      {
        sub: user?.id,
        otpCode,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpToken },
    });

    try {
      // send user email to reset password
      this.emailService.sendEmail({
        to: user.email,
        subject: 'Reset Password - NattyPay',
        template: 'user/request-change-password.hbs',
        context: { firstName: user.fullname.split(' ')[0], otpCode },
      });
    } catch (error) {
      console.log('error sending email', error);
    }

    return {
      message: 'Reset password email sent successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async changePassword(body: ChangePasswordDto, user: User) {
    if (body.otpCode) {
      let payload: any;
      try {
        payload = await this.jwtService.verifyAsync(user?.otpToken, {
          secret: this.configService.get('JWT_SECRET'),
        });
      } catch (error) {
        throw new BadRequestException(
          'Otp code has expired. Please request a new one.',
        );
      }

      if (payload?.otpCode !== body.otpCode) {
        throw new BadRequestException('Invalid otp code');
      }
    }

    const isValidPassword = await bcrypt.compare(
      body.oldPassword,
      user.password,
    );

    if (!isValidPassword) {
      throw new BadRequestException(
        'The Password you entered does not match your current Password. Please try again.',
      );
    }

    if (body.newPassword === body.oldPassword) {
      throw new BadRequestException(
        'New password cannot be the same as the old password',
      );
    }

    const hashedPassword = await bcrypt.hash(body.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return {
      message: 'Password updated successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async forgetPin(user: User) {
    const otpCode = this.generateOtp(4);

    const otpToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        otpCode: otpCode,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpToken },
    });

    try {
      // send reset email
      this.emailService.sendEmail({
        to: user.email,
        subject: 'Reset Wallet Pin - NattyPay',
        template: 'user/reset-pin-email.hbs',
        context: { firstName: user.fullname.split(' ')[0], otpCode: otpCode },
      });
    } catch (error) {
      console.log('error sending reset pin email', error);
    }

    return {
      message: 'Pin reset email sent',
      statusCode: HttpStatus.OK,
    };
  }

  async resetPin(body: ResetWalletPinDto, user: User) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(user?.otpToken, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch (error) {
      throw new BadRequestException('Expired OTP code');
    }

    if (payload?.otpCode !== body.otpCode) {
      throw new BadRequestException('Invalid OTP code');
    }

    if (body.pin !== body.confirmPin)
      throw new BadRequestException(
        'The PIN and confirmation PIN do not match. Please try again.',
      );

    const hashedPin = await bcrypt.hash(body.pin, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { walletPin: hashedPin, otpToken: null },
    });

    return {
      message: 'Your 4-digit wallet PIN has been reset successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async deleteUserAccount(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: {
        wallet: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user?.wallet) {
      this.apiProvider.deleteVirtualAccount(user).then(async () => {
        await this.prisma.user.delete({
          where: { id: userId },
        });
      });
    } else {
      await this.prisma.user.delete({
        where: { id: userId },
      });
    }

    return {
      message: 'Your account has been successfully deleted',
      statusCode: HttpStatus.OK,
    };
  }

  async createAccount(bvn: string, user: User) {
    // let response: any;
    // try {
    //   response = await this.apiProvider.verifyBvn(bvn);
    // } catch (error) {
    //   console.log('error verifying bvn', error);
    //   throw new BadRequestException('Invalid bvn');
    // }

    // if (!response?.entity?.bvn?.status)
    //   throw new BadRequestException('Invalid bvn');

    const newWallet = await this.prisma.$transaction(
      async (trx) => {
        const lockWallet: Wallet[] =
          await trx.$queryRaw`SELECT * FROM wallet WHERE "userId" = ${user?.id}::uuid AND currency = 'NGN' FOR UPDATE LIMIT 1`;

        if (lockWallet.length > 0)
          throw new NotAcceptableException(
            'Naira wallet has been created before',
          );

        let nairaAccount: any;
        try {
          nairaAccount = await this.apiProvider.createVirtualAccount(bvn, user);
        } catch (error) {
          console.log('error creating account', error);
          throw error;
        }

        await trx.user.update({
          where: { id: user.id },
          data: {
            isBvnVerified: true,
            bvn: bvn,
            tierLevel: TIER_LEVEL.one,
            dailyCummulativeTransactionLimit:
              TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
            cummulativeBalanceLimit: TIER_ONE_CUMMULATIVE_BALANCE_LIMIT,
          },
        });

        const newWallet = await trx.wallet.create({
          data: {
            userId: user.id,
            accountName: nairaAccount?.account_name,
            bankName: nairaAccount?.bank_name,
            accountNumber: nairaAccount?.account_number,
            accountRef: nairaAccount?.order_ref,
          },
        });

        return newWallet;
      },
      {
        isolationLevel: 'Serializable',
        timeout: 20000,
      },
    );

    return {
      message: 'Wallet created succesfully',
      statusCode: HttpStatus.CREATED,
      data: plainToInstance(WalletEntity, newWallet),
    };
  }

  async createBusinessAccount(body: CreateBusinessAccountDto, user: User) {
    // let response: any;
    // try {
    //   response = await this.apiProvider.verifyBvn(bvn);
    // } catch (error) {
    //   console.log('error verifying bvn', error);
    //   throw new BadRequestException('Invalid bvn');
    // }

    // if (!response?.entity?.bvn?.status)
    //   throw new BadRequestException('Invalid bvn');

    if (user?.accountType !== ACCOUNT_TYPE.BUSINESS)
      throw new BadRequestException('Account type must be of type business');

    const newWallet = await this.prisma.$transaction(
      async (trx) => {
        const lockWallet: Wallet[] =
          await trx.$queryRaw`SELECT * FROM wallet WHERE "userId" = ${user?.id}::uuid AND currency = 'NGN' FOR UPDATE LIMIT 1`;

        if (lockWallet.length > 0)
          throw new NotAcceptableException(
            'Naira wallet has been created before',
          );

        let nairaAccount: any;
        try {
          nairaAccount = await this.apiProvider.createVirtualBusinessAccount(
            body?.bvn,
            user,
            body,
          );
        } catch (error) {
          console.log('error creating business account', error);
          throw error;
        }

        await trx.user.update({
          where: { id: user.id },
          data: {
            isBvnVerified: true,
            bvn: body.bvn,
            tierLevel: TIER_LEVEL.one,
            // dailyCummulativeTransactionLimit:
            //   TIER_ONE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
            // cummulativeBalanceLimit: TIER_ONE_COMMULATIVE_BALANCE_LIMIT,
          },
        });

        const newWallet = await trx.wallet.create({
          data: {
            userId: user.id,
            accountName: nairaAccount?.account_name,
            bankName: nairaAccount?.bank_name,
            accountNumber: nairaAccount?.account_number,
            accountRef: nairaAccount?.order_ref,
          },
        });

        return newWallet;
      },
      {
        isolationLevel: 'Serializable',
        timeout: 20000,
      },
    );

    return {
      message: 'Business wallet created succesfully',
      statusCode: HttpStatus.CREATED,
      data: plainToInstance(WalletEntity, newWallet),
    };
  }

  async createForeignAccount(currency: string, user: User) {
    if (user?.currency !== currency)
      throw new BadRequestException(`Account must be of ${currency} type`);

    // check if the foreign wallet has been created before
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        currency,
        userId: user?.id,
      },
    });

    if (wallet)
      throw new NotAcceptableException(
        'foreign wallet has been created before',
      );

    let foreignAccount: any;
    try {
      foreignAccount = await this.apiProvider.createForeignAccout(
        currency,
        user,
      );
    } catch (error) {
      console.log('error creating foreign account', error);
      throw error;
    }

    const data = foreignAccount?.data;

    const newWallet = await this.prisma.wallet.create({
      data: {
        userId: user.id,
        accountName: `nattypay/${user?.fullname}`,
        bankName: data?.bank_name,
        accountNumber: data?.account_number,
        accountRef: data?.account_reference,
        bankCode: data?.bank_code,
      },
    });

    return {
      message: 'Wallet created succesfully',
      statusCode: HttpStatus.CREATED,
      data: plainToInstance(WalletEntity, newWallet),
    };
  }

  async editProfile(
    body: EditProfileDto,
    user: User,
    file: Express.Multer.File,
  ) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        fullname: body.fullName,
        phoneNumber: body.phoneNumber,
        profileImageUrl: file?.path,
        profileImageFilename: file?.filename,
      },
    });

    return {
      message: 'Profile updated successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async reportScam(body: ReportScamDto, user: User, file: Express.Multer.File) {
    const ticketRefNumber = user?.scamTicketCount + 1;

    await this.prisma
      .$transaction(
        async (trx) => {
          // update the user ticket count
          await trx.user.update({
            where: { id: user.id },
            data: {
              scamTicketCount: ticketRefNumber,
            },
          });

          // create a scam ticket
          const ticket = await trx.scamTicket.create({
            data: {
              userId: user?.id,
              ref_number: ticketRefNumber,
              title: body.title,
              screenshotImageUrl: file?.path,
              description: body?.description,
            },
          });

          return ticket;
        },
        {
          isolationLevel: 'Serializable',
        },
      )
      .then((ticket: ScamTicket) => {
        // send an aknowledge message of created ticket to the user
        try {
          // send ticket created email
          this.emailService.sendEmail({
            to: user.email,
            subject: `#${ticketRefNumber} Ticket Created - ${body.title}`,
            template: 'user/scam-report-email.hbs',
            context: {
              ticketId: ticketRefNumber,
              title: body.title,
              submissionDate: format(
                new Date(ticket?.createdAt),
                "MMMM do, yyyy 'at' h:mm a",
              ),
            },
          });
        } catch (error) {
          console.log('Error sending email', error);
        }
      });

    return {
      message: 'Information retrieve successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async validatePhoneNumber(body: ValidatePhoneNumberDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (!user) throw new NotFoundException('User with email not found');

    const otpCode = this.generateOtp(4);

    const otpToken = await this.jwtService.signAsync(
      {
        sub: user?.id,
        otpCode,
        phoneNumber: body.phoneNumber,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '10m',
      },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpToken },
    });

    const otpMessage = `Your NattyPay verification code is ${otpCode}. Valid for 10 minutes. Do not share this code with anyone.`;

    const res = await this.apiProvider.sendSms(body.phoneNumber, otpMessage);

    return {
      message: 'Otp code sent to your phone number',
      statusCode: HttpStatus.OK,
      data: res,
    };
  }

  async verifyPhoneNumber(body: VerifyPhoneNumberDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: body.email,
      },
    });

    if (!user) throw new NotFoundException('User with email not found');

    const decoded = await this.jwtService.verifyAsync(user?.otpToken, {
      secret: this.configService.get('JWT_SECRET'),
    });

    if (decoded?.otpCode !== body.otp)
      throw new BadRequestException('Invalid otp code');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true, phoneNumber: decoded?.phoneNumber },
    });

    return {
      message: 'Phone number verified successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async verifyTier2Kyc(body: KycTier2Dto, user: User) {
    let res: any;

    try {
      // get the image base64 without the meta data
      res = await this.apiProvider.verifyNin(body.nin);
    } catch (error) {
      console.log('error verifying nin', error);
      if (error?.response?.status === 400)
        throw new BadRequestException(error?.response?.data?.error);
      throw error;
    }

    const firstName = user?.fullname.split(' ')[0].toLowerCase();
    const lastName = user?.fullname.split(' ')[1].toLowerCase();
    const data = res?.entity;

    if (
      data?.first_name.toLowerCase() !== firstName &&
      data?.first_name.toLowerCase() !== lastName
    ) {
      throw new BadRequestException(
        'The provided NIN does not match your first name or last name. Please verify your details and try again.',
      );
    }

    if (
      data?.last_name.toLowerCase() !== firstName &&
      data?.last_name.toLowerCase() !== lastName
    ) {
      throw new BadRequestException(
        'The provided NIN does not match your first name or last name. Please verify your details and try again.',
      );
    }

    // update the account tier level for VFD bank
    // try {
    //   const upgradeRes = await this.apiProvider.tier2Upgrade(user);
    //   console.log('response from tier2 upgrade', upgradeRes);
    // } catch (error) {
    //   console.log('Failed to upgrade account', error);
    //   throw error;
    // }

    // update the user and kyc level to tier 2
    await this.prisma.user.update({
      where: {
        id: user?.id,
      },
      data: {
        nin: body.nin,
        isNinVerified: true,
        tierLevel: TIER_LEVEL.two,
        dailyCummulativeTransactionLimit:
          TIER_TWO_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
        cummulativeBalanceLimit: TIER_TWO_CUMMULATIVE_BALANCE_LIMIT,
      },
    });

    return {
      message: 'Tier2 kyc verification successful',
      statusCode: HttpStatus.OK,
    };
  }

  async verifyTier3Kyc(body: KycTier3Dto, user: User) {
    let res: any;
    try {
      res = await this.apiProvider.dojahTier3Upgrade(body, user);
    } catch (error) {
      console.log('error upgrading to tier3', error);
      if (error?.response?.status === 400)
        throw new BadRequestException(error?.response?.data?.error);
      throw error;
    }

    console.log('response value from tier3 upgrade', res);

    if (
      res?.entity?.state_of_residence.toLocaleLowerCase() !==
        body?.state.toLocaleLowerCase() ||
      res?.entity?.residential_address.toLocaleLowerCase() !==
        body?.address.toLocaleLowerCase() ||
      res?.entity?.lga_of_residence.toLocaleLowerCase() !==
        body?.city.toLocaleLowerCase()
    )
      throw new BadRequestException('Failed to verify address details');

    // update the user and kyc level to tier 3
    await this.prisma.user.update({
      where: {
        id: user?.id,
      },
      data: {
        address: body?.address,
        state: body?.state,
        city: body?.city,
        isAddressVerified: true,
        tierLevel: TIER_LEVEL.three,
        dailyCummulativeTransactionLimit:
          TIER_THREE_DAILY_CUMMULATIVE_TRANSACTION_LIMIT,
        cummulativeBalanceLimit: TIER_THREE_CUMMULATIVE_BALANCE_LIMIT,
      },
    });

    return {
      message: 'Tier3 kyc verification successful',
      statusCode: HttpStatus.OK,
    };
  }

  private generateOtp(length: number): string {
    const digits = '0123456789'; // Only digits for OTP
    let otp = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * digits.length);
      otp += digits[randomIndex];
    }

    return otp;
  }
}
