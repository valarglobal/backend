import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
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
  ELECTRICITY_FEE,
  ETISALAT_PREFIXES,
  GIFT_CARD_FEE,
  GLO_PREFIXES,
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

@Injectable()
export class BillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiProvider: ApiProviderService,
  ) {}

  async getAirtimePlan(phone: number, currency: string) {
    const network = this.getNetworkProvider(String(phone));
    const countryISOCode =
      this.apiProvider.getCountryCodeFromCurrency(currency);

    const airtimePlan = await this.prisma.airtimePlan.findFirst({
      where: {
        network,
        countryISOCode,
      },
    });

    return {
      message: 'Airtime plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: {
        network,
        plan: airtimePlan,
      },
    };
  }

  async getDataPlan(phone: number, currency: string) {
    const network = this.getNetworkProvider(String(phone));
    const countryISOCode =
      this.apiProvider.getCountryCodeFromCurrency(currency);

    const dataPlan = await this.prisma.dataPlan.findMany({
      where: {
        network,
        countryISOCode,
      },
    });

    return {
      message: 'Data plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: {
        network,
        plan: dataPlan,
      },
    };
  }

  async getCablePlan(currency: string) {
    const countryISOCode =
      this.apiProvider.getCountryCodeFromCurrency(currency);

    const cablePlan = await this.prisma.cablePlan.findMany({
      where: {
        countryISOCode,
      },
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
      where: {
        countryISOCode,
      },
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
      where: {
        countryISOCode,
      },
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
      where: {
        countryISOCode,
      },
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
      where: {
        countryISOCode,
      },
    });

    return {
      message: 'School fee plan retrieve successfully',
      statusCode: HttpStatus.OK,
      data: schoolfeePlan,
    };
  }

  async getVariation(operatorId: number) {
    let res: any;
    try {
      res = await this.apiProvider.getOperator(operatorId);
    } catch (error) {
      console.log('error getting variation amount', error);
      throw error;
    }

    return {
      message: 'Variation retrieve successfully',
      statusCode: HttpStatus.OK,
      data: res,
    };
  }

  async getGiftCardCategories() {
    let res: any;
    try {
      res = this.apiProvider.getGiftCardCategories();
    } catch (error) {
      console.log('error while getting categories', error);
      throw error;
    }

    return res;
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
    let res: any;
    try {
      res = await this.apiProvider.verifyBillerNumber(body);
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

    return res;
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
      const payAmountMap = new Map();
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

  async pay(
    body: PayDto | GiftCardPayDto | PayBillDto,
    user: User,
    bill_type:
      | 'airtime'
      | 'data'
      | 'giftcard'
      | 'cable'
      | 'electricity'
      | 'transport'
      | 'schoolfee',
  ) {
    let res: any;

    // check the balance of the user
    await this.prisma.$transaction(
      async (trx) => {
        // get user wallet
        const lockWallet: Wallet[] =
          await trx.$queryRaw`SELECT * FROM wallet WHERE "userId" = ${user?.id}::uuid FOR UPDATE LIMIT 1`;

        if (!lockWallet)
          throw new NotFoundException('Wallet for user not found');

        // check for sufficient balance
        if (lockWallet[0]?.balance < body.amount)
          throw new BadRequestException('Insufficient balance');

        const oldBalance = lockWallet[0]?.balance;
        const newBalance = oldBalance - body.amount;

        // update the wallet balance
        await trx.wallet.update({
          where: {
            id: lockWallet[0]?.id,
          },
          data: {
            balance: newBalance,
          },
        });

        try {
          const trx_ref = this.generateTransactionRef('DEBIT');

          if (bill_type === 'airtime' || bill_type === 'data') {
            res = await this.apiProvider.purchaseTopup(
              body as PayDto,
              user?.email,
              trx_ref,
            );
          } else if (bill_type === 'giftcard') {
            res = await this.apiProvider.purchaseGiftcard(
              body as GiftCardPayDto,
              user?.email,
              trx_ref,
            );
          } else if (bill_type === 'cable' || bill_type === 'electricity') {
            res = await this.apiProvider.purchaseBill(
              body as PayBillDto,
              trx_ref,
            );
          } else if (bill_type === 'transport' || bill_type === 'schoolfee') {
            res = await this.apiProvider.purchaseBillWithIdentifier(
              body as PayBillDto,
              user?.id,
              trx_ref,
            );
          }
        } catch (error) {
          console.log('error paying for airtime or data');
          throw error;
        }

        // create bill debit transaction
        await trx.transaction.create({
          data: {
            walletId: lockWallet[0]?.id,
            transactionRef: res?.customIdentifier ?? res?.tx_ref,
            type: TRANSACTION_TYPE.DEBIT,
            category: TRANSACTION_CATEGORY.BILL_PAYMENT,
            currency: body.currency,
            status: TRANSACTION_STATUS.success,
            previousBalance: oldBalance,
            currentBalance: newBalance,
            billDetails: {
              recipientEmail: res?.recipientEmail,
              recipientPhone: res?.recipientPhone ?? res?.phone_number,
              type: bill_type,
              fee: res?.fee,
              reference: res?.reference,
              amount: body?.amount,
              ...(bill_type === 'airtime' || bill_type === 'data'
                ? { network: this.getNetworkProvider((body as PayDto).phone) }
                : {}),
            },
          },
        });
      },
      {
        isolationLevel: 'Serializable',
        timeout: 20000,
      },
    );

    return {
      message: 'Purchase successfully',
      statusCode: HttpStatus.OK,
      data: {
        ...(res?.recharge_token ? { recharge_token: res?.recharge_token } : {}),
      },
    };
  }

  private getNetworkProvider(phoneNumber: string): NETWORK {
    const formattedNumber = this.formatPhoneNumber(phoneNumber);

    const isMtn = MTN_PREFIXES.some((prefix) =>
      formattedNumber.startsWith(prefix),
    );

    if (isMtn) return NETWORK.mtn;

    const isGlo = GLO_PREFIXES.some((prefix) =>
      formattedNumber.startsWith(prefix),
    );

    if (isGlo) return NETWORK.glo;

    const isAirtel = AIRTEL_PREFIXES.some((prefix) =>
      formattedNumber.startsWith(prefix),
    );

    if (isAirtel) return NETWORK.airtel;

    const isEtisalat = ETISALAT_PREFIXES.some((prefix) =>
      formattedNumber.startsWith(prefix),
    );

    if (isEtisalat) return NETWORK.etisalat;
  }

  private formatPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.charAt(0) !== '0') {
      return '0' + phoneNumber;
    }
    return phoneNumber;
  }

  private generateTransactionRef(type: string) {
    const prefix = type === 'CREDIT' ? 'credit_' : 'debit_';
    const uniqueId = uuidv4(); // Generate a unique UUID
    return `${prefix}${uniqueId}`;
  }
}
