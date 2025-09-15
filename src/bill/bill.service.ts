import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  Beneficiary,
  BENEFICIARY_TYPE,
  BILL_TYPE,
  NETWORK,
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
  User,
  Wallet,
} from '@prisma/client';
import { ApiProviderService } from 'src/api-providers/api-providers.service';
import {
  AIRTEL_PREFIXES,
  CABLE_FEE,
  CONCURRENT_BASE_DELAY,
  CONCURRENT_MAX_RETRIES,
  ELECTRICITY_FEE,
  ETISALAT_PREFIXES,
  GIFT_CARD_FEE,
  GLO_PREFIXES,
  INTERNATIONAL_AIRTIME_FEE,
  INTERNET_FEE,
  MTN_PREFIXES,
  SCHOOLFEE_FEE,
  TRANSPORT_FEE,
} from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { PayDto } from './dto/PayDto';
import { v4 as uuidv4 } from 'uuid';
import { GiftCardPayDto } from './dto/GiftCardPayDto';
import { VerifyBillerDto } from './dto/VerifyBillerDto';
import { PayBillDto } from './dto/PayBillDto';
import * as bcrypt from 'bcrypt';
import parsePhoneNumber, { PhoneNumber } from 'libphonenumber-js';
import { getSMSAlertMessage } from 'src/utils';

@Injectable()
export class BillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiProvider: ApiProviderService,
  ) {}

  /* -------------------------
     Public plan / lookup APIs
     ------------------------- */
  async getAirtimeNetworkProviders() {
    const networks = await this.prisma.airtimePlan.findMany();

    return {
      message: 'Airtime network providers retrieve successfully',
      statusCode: HttpStatus.OK,
      data: networks,
    };
  }

  async getDataPlanByNetwork(network: string) {
    const networkQuerykey = this.resolveNetworkFromString(network);

    const dataPlan = await this.prisma.dataPlan.findMany({
      where: { network: networkQuerykey },
    });

    return {
      message: 'Data plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: dataPlan,
    };
  }

  async getAirtimePlan(phone: number, currency: string) {
    if (!phone || phone.toString().length !== 11)
      throw new BadRequestException('Invalid phone number');

    const network = this.getNetworkProvider(String(phone));
    if (!network) throw new NotFoundException('Enter a valid phone number');

    const countryISOCode =
      this.apiProvider.getCountryCodeFromCurrency(currency);

    const airtimePlan = await this.prisma.airtimePlan.findFirst({
      where: { network, countryISOCode },
    });

    let res: any;
    try {
      res = await this.apiProvider.getOperator(airtimePlan?.operatorId);
    } catch (error) {
      console.log('error getting variation amount', error);
      throw error;
    }

    return {
      message: 'Airtime plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: { network, plan: res },
    };
  }

  async getInternationalAirtimePlan(phone: number) {
    const parsedNumber: PhoneNumber | null = this.getInternationalParsedNumber(
      String(phone),
    );

    if (!parsedNumber || !parsedNumber.isValid())
      throw new BadRequestException('Invalid phone number');

    const countryISOCode = parsedNumber?.country;

    let res: any;
    try {
      res = await this.apiProvider.getAutoDetectOperator(phone, countryISOCode);
    } catch (error) {
      console.log('error getting auto detect operator', error);
      throw error;
    }

    return {
      message: 'Airtime plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: { ...res, payAmount: res?.fees?.local + INTERNATIONAL_AIRTIME_FEE },
    };
  }

  async getAirtimeFxRate(amount: number, operatorId: number) {
    const res = await this.apiProvider.getAirtimeFxRate(amount, operatorId);

    return {
      message: 'Airtime fx rate retrieve successfully',
      statusCode: HttpStatus.OK,
      data: res,
    };
  }

  async getGiftCardFxRate(amount: number, currency: string) {
    const res = await this.apiProvider.getGiftCardFxRate(amount, currency);

    return {
      message: 'Gift card fx rate retrieve successfully',
      statusCode: HttpStatus.OK,
      data: res,
    };
  }

  async getDataPlan(phone: number, currency: string) {
    const network = this.getNetworkProvider(String(phone));
    const countryISOCode =
      this.apiProvider.getCountryCodeFromCurrency(currency);

    const dataPlan = await this.prisma.dataPlan.findMany({
      where: { network, countryISOCode },
    });

    return {
      message: 'Data plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: { network, plan: dataPlan },
    };
  }

  async getCablePlan(currency: string) {
    const countryISOCode =
      this.apiProvider.getCountryCodeFromCurrency(currency);
    const cablePlan = await this.prisma.cablePlan.findMany({
      where: { countryISOCode },
    });

    return {
      message: 'Cable plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: cablePlan,
    };
  }

  async getElectricityPlan(currency: string) {
    const countryISOCode =
      this.apiProvider.getCountryCodeFromCurrency(currency);
    const electricityPlan = await this.prisma.electricityPlan.findMany({
      where: { countryISOCode },
    });

    return {
      message: 'Electricity plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: electricityPlan,
    };
  }

  async getInternetPlan(currency: string) {
    const countryISOCode =
      this.apiProvider.getCountryCodeFromCurrency(currency);
    const internetPlan = await this.prisma.internetservicePlan.findMany({
      where: { countryISOCode },
    });

    return {
      message: 'Internet plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: internetPlan,
    };
  }

  async getTransportPlan(currency: string) {
    const countryISOCode =
      this.apiProvider.getCountryCodeFromCurrency(currency);
    const transportPlan = await this.prisma.transportPlan.findMany({
      where: { countryISOCode },
    });

    return {
      message: 'Transport plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: transportPlan,
    };
  }

  async getSchoolfeePlan(currency: string) {
    const countryISOCode =
      this.apiProvider.getCountryCodeFromCurrency(currency);
    const schoolfeePlan = await this.prisma.schoolfeePlan.findMany({
      where: { countryISOCode },
    });

    return {
      message: 'School fee plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: schoolfeePlan,
    };
  }

  async getVariation(operatorId: number) {
    try {
      const res = await this.apiProvider.getOperator(operatorId);
      return {
        message: 'Variation retrieve successfully',
        statusCode: HttpStatus.OK,
        data: res,
      };
    } catch (error) {
      console.log('error getting variation amount', error);
      throw error;
    }
  }

  async getGiftCardCategories() {
    try {
      const res = await this.apiProvider.getGiftCardCategories();
      return res;
    } catch (error) {
      console.log('error while getting categories', error);
      throw error;
    }
  }

  async redeemGiftCard(transactionId: number) {
    try {
      const res = await this.apiProvider.redeemGiftCard(transactionId);
      return {
        message: 'Giftcard redeemed successfully',
        statusCode: HttpStatus.OK,
        data: res,
      };
    } catch (error) {
      console.log('error while redeeming giftcard', error);
      throw error;
    }
  }

  async getBillInfo(
    billerCode: string,
    bill_type: 'cable' | 'electricity' | 'internet' | 'schoolfee' | 'transport',
  ) {
    let res: any;
    try {
      res = await this.apiProvider.getBillInfo(billerCode);
    } catch (error) {
      console.log('error while getting bill information', error);
      throw error;
    }

    let fee = 0;
    switch (bill_type) {
      case 'cable':
        fee = CABLE_FEE;
        break;
      case 'electricity':
        fee = ELECTRICITY_FEE;
        break;
      case 'internet':
        fee = INTERNET_FEE;
        break;
      case 'schoolfee':
        fee = SCHOOLFEE_FEE;
        break;
      case 'transport':
        fee = TRANSPORT_FEE;
        break;
    }

    return {
      message: 'Bill information retrieve successfully',
      statusCode: HttpStatus.OK,
      data: res?.map((data: any) => ({
        ...data,
        payAmount: data?.fee + fee + data?.amount,
      })),
    };
  }

  async verifyBillerNumber(
    body: VerifyBillerDto,
    bill_type: 'cable' | 'electricity',
  ) {
    try {
      const res = await this.apiProvider.verifyBillerNumber(body);
      return {
        message: 'Biller number verified successfully',
        statusCode: HttpStatus.OK,
        data: res,
      };
    } catch (error) {
      console.log('error while verifying number', error);

      let errorMessage = '';
      switch (bill_type) {
        case 'electricity':
          errorMessage = 'Invalid meter number';
          break;
        case 'cable':
          errorMessage = 'Invalid smartcard number';
          break;
        default:
          errorMessage = error?.response?.data?.message;
          break;
      }

      if (error?.response?.status === 400)
        throw new BadRequestException(errorMessage);

      throw error;
    }
  }

  async getProductByISOCode(currency: string) {
    let res: any;
    try {
      res = await this.apiProvider.getProductByISOCode(currency);
    } catch (error) {
      console.log('error while getting product by ISO code', error);
      throw error;
    }

    const resData = res?.map((data: any) => {
      const payAmountMap = new Map<string | number, number>();
      if (data?.denominationType === 'FIXED') {
        if (
          Array.isArray(data?.fixedSenderDenominations) &&
          Array.isArray(data?.fixedRecipientDenominations) &&
          data.fixedSenderDenominations.length ===
            data.fixedRecipientDenominations.length
        ) {
          data.fixedSenderDenominations.forEach(
            (price: number, index: number) => {
              const recipientDenomination =
                data.fixedRecipientDenominations[index];
              const totalPrice = price + data?.senderFee + GIFT_CARD_FEE;
              payAmountMap.set(String(recipientDenomination), totalPrice);
            },
          );
        } else {
          console.warn(
            'Mismatch in sender and recipient denominations or invalid data:',
            data,
          );
        }
      } else {
        payAmountMap.set(
          String(data?.minRecipientDenomination),
          data?.minSenderDenomination + data?.senderFee + GIFT_CARD_FEE,
        );
        payAmountMap.set(
          String(data?.maxRecipientDenomination),
          data?.maxSenderDenomination + data?.senderFee + GIFT_CARD_FEE,
        );
      }

      return {
        ...data,
        fixedRecipientToPayAmount: Object.fromEntries(payAmountMap),
      };
    });

    return {
      message: 'Product retrieve successfully',
      statusCode: HttpStatus.OK,
      data: resData,
    };
  }

  /* -------------------------
     Main payment workflow
     ------------------------- */
  async pay(
    body: PayDto | GiftCardPayDto | PayBillDto,
    user: User & { wallet: Wallet },
    bill_type: BILL_TYPE,
  ) {
    // 1. PIN check
    if (!user?.isWalletPinSet)
      throw new BadRequestException('Wallet pin not set');

    const isMatched = await bcrypt.compare(body?.walletPin, user?.walletPin);
    if (!isMatched) throw new BadRequestException('Incorrect pin');

    // Prepare refs & retry constants
    const trx_ref_master = this.generateTransactionRef('DEBIT');
    const MAX_RETRIES = CONCURRENT_MAX_RETRIES;
    const BASE_DELAY = CONCURRENT_BASE_DELAY;

    // Variables that will be populated during initial transaction creation
    let pendingTransactionId: string;
    let lockWallet: Wallet[] = [];
    let oldBalance = 0;
    let newBalance = 0;

    // 2. Create pending transaction and debit wallet inside a serializable transaction with FOR UPDATE locking
    try {
      await this.prisma.$transaction(
        async (trx) => {
          // lock wallet
          lockWallet =
            await trx.$queryRaw`SELECT * FROM wallet WHERE "userId" = ${user?.id}::uuid FOR UPDATE SKIP LOCKED`;

          if (!lockWallet || lockWallet.length === 0)
            throw new ConflictException(
              'Unable to access wallet at this time, please try again',
            );

          if (lockWallet[0]?.balance < body.amount)
            throw new BadRequestException('Insufficient balance');

          oldBalance = lockWallet[0]?.balance;
          newBalance = oldBalance - body.amount;

          // update wallet
          await trx.wallet.update({
            where: { id: lockWallet[0]?.id },
            data: { balance: newBalance },
          });

          // create pending transaction (debit)
          const pendingTrx = await trx.transaction.create({
            data: {
              walletId: lockWallet[0]?.id,
              transactionRef: trx_ref_master,
              type: TRANSACTION_TYPE.DEBIT,
              category: TRANSACTION_CATEGORY.BILL_PAYMENT,
              currency: body.currency,
              status: TRANSACTION_STATUS.pending,
              previousBalance: oldBalance,
              currentBalance: newBalance,
              billDetails: {
                type: bill_type,
                amount: body?.amount,
                amountPaid: body?.amount,
                ...(bill_type === 'airtime' || bill_type === 'data'
                  ? {
                      network: this.getNetworkProvider((body as PayDto).phone),
                      recipientPhone: (body as PayDto).phone,
                    }
                  : {}),
                ...(bill_type === 'electricity' || bill_type === 'cable'
                  ? { recipientPhone: (body as PayBillDto).billerNumber }
                  : {}),
              },
            },
          });

          pendingTransactionId = pendingTrx.id;
        },
        { isolationLevel: 'Serializable', timeout: 10000 },
      );
    } catch (error) {
      console.log('Error initiating bill payment', error);
      throw new InternalServerErrorException(
        'Service temporarily unavailable. Please retry shortly.',
      );
    }

    // 3. Attempt actual provider purchase with retries and exponential backoff
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Optionally add beneficiary (if requested)
        if (body?.addBeneficiary) {
          await this.addBeneficiaryIfNeeded(user?.id, body, bill_type);
        }

        // provider purchase (new trx_ref per provider call)
        const providerTrxRef = this.generateTransactionRef('DEBIT');
        const res = await this.callProviderPurchase(
          bill_type,
          body,
          user,
          providerTrxRef,
        );

        // update transaction as success
        await this.updateTransactionSuccess(
          pendingTransactionId,
          res,
          body,
          bill_type,
        );

        // send sms (best-effort)
        try {
          await this.sendSmsAlert(
            lockWallet[0],
            user?.phoneNumber,
            body,
            res,
            newBalance,
            bill_type,
          );
        } catch (smsErr) {
          console.log('error while sending sms message', smsErr);
        }

        // return response to client
        return {
          message: 'Purchase successfully',
          statusCode: HttpStatus.OK,
          data: {
            ...(res?.recharge_token
              ? { recharge_token: res?.recharge_token }
              : {}),
            ...(bill_type === 'giftcard'
              ? { transactionId: res?.transactionId }
              : {}),
          },
        };
      } catch (error: any) {
        // Handle concurrency/serialization errors and retry with backoff
        if (
          (error?.code === 'P2034' || error?.code === 'P40001') &&
          attempt < MAX_RETRIES - 1
        ) {
          const delay =
            Math.min(BASE_DELAY * Math.pow(2, attempt), 5000) +
            Math.random() * 100;
          console.log(
            `Serialization failure on attempt ${attempt + 1}. Retrying in ${delay}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // For any other failure: mark transaction failed & refund wallet
        try {
          await this.prisma.transaction.update({
            where: { id: pendingTransactionId },
            data: {
              status: TRANSACTION_STATUS.failed,
              currentBalance: oldBalance + body?.amount,
            },
          });
        } catch (updErr) {
          console.error(
            'Failed to update pending transaction to failed',
            updErr,
          );
        }

        try {
          await this.refundAndUnlockWallet(lockWallet[0], body as any);
        } catch (refundErr) {
          console.error('Refund failed', refundErr);
          // If refund failed, escalate as internal server error
        }

        console.error('Transaction failed:', error);
        if (error instanceof BadRequestException) throw error;
        throw new InternalServerErrorException('Payment processing failed');
      }
    }

    // If all retries exhausted
    throw new InternalServerErrorException('Payment processing failed');
  }

  /* -------------------------
     Private helpers
     ------------------------- */

  private resolveNetworkFromString(network: string): NETWORK {
    switch (network?.toLocaleLowerCase()) {
      case 'mtn':
        return NETWORK.mtn;
      case 'airtel':
        return NETWORK.airtel;
      case 'etisalat':
        return NETWORK.etisalat;
      case 'glo':
        return NETWORK.glo;
      default:
        throw new BadRequestException('Unsupported network');
    }
  }

  private async addBeneficiaryIfNeeded(
    userId: string,
    body: PayDto | GiftCardPayDto | PayBillDto,
    bill_type: BILL_TYPE,
  ) {
    let beneficiary: Beneficiary | null = null;

    if (
      bill_type === BILL_TYPE.airtime ||
      bill_type === BILL_TYPE.data ||
      bill_type === BILL_TYPE.internationalAirtime
    ) {
      beneficiary = await this.prisma.beneficiary.findFirst({
        where: {
          userId,
          billType: bill_type,
          billerNumber: (body as PayDto)?.phone,
        },
      });
    } else if (
      bill_type === BILL_TYPE.cable ||
      bill_type === BILL_TYPE.electricity
    ) {
      beneficiary = await this.prisma.beneficiary.findFirst({
        where: {
          userId,
          billType: bill_type,
          billerNumber: (body as PayBillDto)?.billerNumber,
        },
      });
    }

    if (!beneficiary) {
      let payload: any;
      if (
        bill_type === BILL_TYPE.airtime ||
        bill_type === BILL_TYPE.data ||
        bill_type === BILL_TYPE.internationalAirtime
      ) {
        payload = {
          userId,
          type: BENEFICIARY_TYPE.BILL,
          billType: bill_type,
          billerNumber: (body as PayDto)?.phone,
          network: this.getNetworkProvider((body as PayDto)?.phone),
          operatorId: (body as PayDto)?.operatorId,
        };
      } else if (
        bill_type === BILL_TYPE.cable ||
        bill_type === BILL_TYPE.electricity
      ) {
        payload = {
          userId,
          type: BENEFICIARY_TYPE.BILL,
          billType: bill_type,
          billerCode: (body as PayBillDto)?.billerCode,
          itemCode: (body as PayBillDto)?.itemCode,
          billerNumber: (body as PayBillDto)?.billerNumber,
        };
      }

      if (payload) {
        await this.prisma.beneficiary.create({ data: payload });
      }
    }
  }

  private async callProviderPurchase(
    bill_type: BILL_TYPE | string,
    body: PayDto | GiftCardPayDto | PayBillDto,
    user: User & { wallet: Wallet },
    trx_ref: string,
  ) {
    try {
      if (bill_type === 'airtime' || bill_type === 'data') {
        return await this.apiProvider.purchaseTopup(
          body as PayDto,
          user?.email,
          trx_ref,
        );
      } else if (bill_type === 'giftcard') {
        return await this.apiProvider.purchaseGiftcard(
          body as GiftCardPayDto,
          user?.email,
          trx_ref,
        );
      } else if (
        bill_type === 'cable' ||
        bill_type === 'electricity' ||
        bill_type === 'internet' ||
        bill_type === 'transport' ||
        bill_type === 'schoolfee'
      ) {
        return await this.apiProvider.purchaseBill(body as PayBillDto, trx_ref);
      } else {
        return await this.apiProvider.purchaseBillWithIdentifier(
          body as PayBillDto,
          user?.id,
          trx_ref,
        );
      }
    } catch (error) {
      console.error(`Error paying for ${bill_type}`, error);
      throw new InternalServerErrorException('Payment processing failed');
    }
  }

  private async updateTransactionSuccess(
    transactionId: string,
    providerRes: any,
    body: PayDto | GiftCardPayDto | PayBillDto,
    bill_type: BILL_TYPE,
  ) {
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TRANSACTION_STATUS.success,
        billDetails: {
          recipientEmail: providerRes?.recipientEmail,
          recipientPhone:
            providerRes?.recipientPhone ?? providerRes?.phone_number,
          type: bill_type,
          fee: providerRes?.fee,
          reference: providerRes?.reference,
          amount: body?.amount,
          amountPaid: body?.amount,
          ...(bill_type === 'airtime' || bill_type === 'data'
            ? { network: this.getNetworkProvider((body as PayDto).phone) }
            : {}),
          ...(bill_type === 'giftcard'
            ? { transactionId: providerRes?.transactionId }
            : {}),
          ...(bill_type === 'electricity' && providerRes?.recharge_token
            ? { recharge_token: providerRes?.recharge_token }
            : {}),
        },
      },
    });
  }

  private async refundAndUnlockWallet(
    lockWalletRow: Wallet,
    body: { amount: number; currency: string },
  ) {
    await this.prisma.$transaction(async (trx) => {
      const lockfromWallet: Wallet[] =
        await trx.$queryRaw`SELECT * FROM wallet WHERE id = ${lockWalletRow?.id}::uuid AND currency::text = ${body.currency.toString()}  FOR UPDATE SKIP LOCKED LIMIT 1`;

      if (!lockfromWallet.length || !lockfromWallet[0]) {
        throw new ConflictException(
          'Unable to access wallet at this time, please try again',
        );
      }

      await trx.wallet.update({
        where: { id: lockfromWallet[0]?.id },
        data: { balance: lockfromWallet[0]?.balance + body?.amount },
      });
    });
  }

  private async sendSmsAlert(
    walletRow: Wallet,
    userPhoneNumber: string,
    body: PayDto | GiftCardPayDto | PayBillDto,
    providerRes: any,
    newBalance: number,
    bill_type: BILL_TYPE,
  ) {
    try {
      const AccountNumber = walletRow?.accountNumber ?? '';
      const maskedAccountNumber =
        AccountNumber.length >= 6
          ? `${AccountNumber.substring(0, 2)}xxx..${AccountNumber.substring(AccountNumber.length - 4, AccountNumber.length - 1)}x`
          : AccountNumber;

      const now = new Date();
      const formattedDate = now.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const smsMessage = getSMSAlertMessage(
        String(body?.amount),
        providerRes?.recipientPhone ?? providerRes?.phone_number,
        walletRow?.accountName,
        providerRes?.customIdentifier ?? providerRes?.tx_ref,
        formattedDate,
        Number(newBalance.toFixed(2)),
        bill_type,
        { isCredit: false },
        maskedAccountNumber,
        '',
        '',
        '',
        bill_type === BILL_TYPE.electricity ? providerRes?.recharge_token : '',
      );

      this.apiProvider.sendSms(userPhoneNumber, smsMessage, 'termii');
    } catch (error) {
      // best-effort only — do not fail the whole payment flow because of SMS
      console.log('error while sending sms message', error);
    }
  }

  /* -------------------------
     Utility helpers
     ------------------------- */
  private getNetworkProvider(phoneNumber: string): NETWORK {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);

    if (MTN_PREFIXES.some((prefix) => formattedNumber.startsWith(prefix)))
      return NETWORK.mtn;
    if (GLO_PREFIXES.some((prefix) => formattedNumber.startsWith(prefix)))
      return NETWORK.glo;
    if (AIRTEL_PREFIXES.some((prefix) => formattedNumber.startsWith(prefix)))
      return NETWORK.airtel;
    if (ETISALAT_PREFIXES.some((prefix) => formattedNumber.startsWith(prefix)))
      return NETWORK.etisalat;

    return undefined;
  }

  private formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return phoneNumber;
    if (phoneNumber.charAt(0) !== '0') {
      return '0' + phoneNumber;
    }
    return phoneNumber;
  }

  private generateTransactionRef(type: string) {
    const prefix = type === 'CREDIT' ? 'credit_' : 'debit_';
    const uniqueId = uuidv4();
    return `${prefix}${uniqueId}`;
  }

  private getInternationalParsedNumber = (phoneNumber: string) => {
    if (!phoneNumber) return null;
    if (phoneNumber.startsWith('+')) {
      return parsePhoneNumber(phoneNumber);
    }
    if (phoneNumber.startsWith('0')) {
      const normalizedNumber = phoneNumber.substring(1);
      const withNG = parsePhoneNumber(normalizedNumber, 'NG');
      if (withNG?.isValid()) {
        return withNG;
      }
    }
    return parsePhoneNumber(`+${phoneNumber}`);
  };
}
