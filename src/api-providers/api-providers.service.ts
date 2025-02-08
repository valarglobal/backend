import { Injectable } from '@nestjs/common';
import { SafeHavenService } from './providers/safe-haven.service';
import { User } from '@prisma/client';
import { DojahService } from './providers/dojah.service';
import { FlutterwaveService } from './providers/flutterwave.service';
import { TransferDto } from 'src/wallet/dto/TransferDto';
import { ReloadlyService } from './providers/reloadly.service';
import { PayDto } from 'src/bill/dto/PayDto';
import { VFDBankService } from './providers/VFDBank.service';
import { GiftCardPayDto } from 'src/bill/dto/GiftCardPayDto';
import { VerifyBillerDto } from 'src/bill/dto/VerifyBillerDto';
import { PayBillDto } from 'src/bill/dto/PayBillDto';
import { CreateBusinessAccountDto } from 'src/user/dto/CreateBusinessAccountDto';
import { KycTier3Dto } from 'src/user/dto/KycTier3Dto';
import { InitiateBvnVerificationDto } from 'src/wallet/dto/InitiateBvnVerificationDto';
import { ConfigService } from '@nestjs/config';
import { ValidateBvnVerificationDto } from 'src/wallet/dto/ValidateBvnVerificationDto';
import { defaultBankName } from 'src/constants';

@Injectable()
export class ApiProviderService {
  constructor(
    private readonly flutterwaveService: FlutterwaveService,
    private readonly dojahService: DojahService,
    private readonly reloadlyService: ReloadlyService,
    private readonly VFDBankService: VFDBankService,
    private readonly safeHavenService: SafeHavenService,
    private readonly configService: ConfigService,
  ) {}

  async getSafeHavenBankName(bankCode: string) {
    return this.safeHavenService.getBankName(bankCode);
  }

  addCountryCode(phoneNumber: string) {
    // Check if the phone number already starts with '+234'
    if (phoneNumber.startsWith('+234')) {
      return phoneNumber;
    }
    // Remove leading zeros and add '+234'
    if (phoneNumber.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1);
    }
    return '+234' + phoneNumber;
  }

  async createVirtualAccount(
    bvn: string,
    user: User,
    verificationId?: string,
    otpCode?: string,
  ): Promise<{
    account_name: string;
    account_number: string;
    bank_name?: string;
    order_ref?: string;
  }> {
    // flutterwave bank
    // const res = await this.flutterwaveService.createVirtualAccount({
    //   bvn,
    //   email: user?.email,
    //   narration: `NattyPay/${user?.fullname}`,
    //   is_permanent: true,
    // });
    // return {
    //   account_name: `NattyPay/${user?.fullname}`,
    //   account_number: res?.account_number,
    //   order_ref: res?.order_ref,
    //   bank_name: res?.bank_name,
    // };

    // // vfd bank
    // const res = await this.VFDBankService.createNoConsentVirtualAccount({
    //   bvn: bvn,
    //   dateOfBirth: user?.dateOfBirth,
    // });

    // console.log('res', res);
    // return {
    //   account_name: `${res?.firstname} ${res?.lastname}`,
    //   account_number: res?.accountNo,
    //   bank_name: 'VFD MFB',
    // };

    //safe haven bank

    const res = await this.safeHavenService.createSubAccount({
      phoneNumber: this.addCountryCode(user?.phoneNumber),
      emailAddress: user?.email,
      externalReference: user?.id,
      bvn,
      verificationId,
      otpCode,
    });

    console.log('create account res', res);
    return {
      account_name: res?.accountName,
      account_number: res?.accountNumber,
      bank_name: defaultBankName,
    };
  }

  async initiateSafeHavenBvnVerification(body: InitiateBvnVerificationDto) {
    return this.safeHavenService.initiateVerification({
      type: 'BVN',
      number: body?.bvn,
      debitAccountNumber: this.configService.get<string>(
        'SAFEHAVE_DEBIT_ACCOUNT_NUMBER',
      ),
    });
  }

  async validateSafeHavenBvnVerification(body: ValidateBvnVerificationDto) {
    return this.safeHavenService.validateVerification({
      identityId: body?.verificationId,
      type: 'BVN',
      otp: body?.otpCode,
    });
  }

  async createVirtualBusinessAccount(body: CreateBusinessAccountDto) {
    return this.VFDBankService.createNoConsentBusinessVirtualAccount({
      bvn: body?.bvn,
      incorporationDate: body?.incorporationDate,
      rcNumber: body?.rcNumber,
      companyName: body?.companyName,
    });
  }

  async tier2Upgrade(user: User & { wallet?: any }) {
    return this.VFDBankService.tier2Upgrade({
      accountNumber: user?.wallet?.accountNumber,
      nin: user?.nin,
    });
  }

  async dojahTier3Upgrade(body: KycTier3Dto, user: User) {
    return this.dojahService.verifyAddressDetails(
      {
        address: body?.address,
        city: body?.city,
        state: body?.state,
      },
      user,
    );
  }

  async tier3Upgrade(body: KycTier3Dto, user: User & { wallet?: any }) {
    if (user?.tierLevel == 'one') {
      return this.VFDBankService.tier3Upgrade({
        accountNumber: user?.wallet?.accountNumber,
        nin: user?.nin,
        address: body?.address,
      });
    }

    return this.VFDBankService.tier3Upgrade({
      accountNumber: user?.wallet?.accountNumber,
      address: body?.address,
    });
  }

  async deleteVirtualAccount(user: User & { wallet?: any }) {
    return this.flutterwaveService.deleteVirtualAccount(
      user?.wallet?.order_ref,
    );
  }

  async createForeignAccout(currency: string, user: User) {
    return this.flutterwaveService.createForeignAccount({
      account_name: `nattypay/${user?.fullname}`,
      email: user?.email,
      // mobilenumber: '010101010',
      country: this.getCountryCodeFromCurrency(currency),
    });
  }

  async verifyBvn(bvn: string) {
    return this.dojahService.validateBvn(bvn);
  }

  async verifyAccount(accountNumber: string, accountBank: string) {
    //flutterwave
    // return this.flutterwaveService.verifyAccount({
    //   account_number: accountNumber,
    //   account_bank: accountBank,
    // });

    // safe haven
    return this.safeHavenService.getNameEquiry(accountBank, accountNumber);
  }

  async verifyNinWithSelfie(nin: string, selfieBase64: string) {
    return this.dojahService.verifyNinWithSelfie({
      selfie_image: selfieBase64,
      nin,
    });
  }

  async verifyNin(nin: string) {
    return this.dojahService.verifyNin({ nin });
  }

  async bvnLookUp(bvn: string) {
    return this.dojahService.bvnLookUp(bvn);
  }

  async getAllBanks(currency: string) {
    const country = this.getCountryCodeFromCurrency(currency);
    // flutterwave
    // return this.flutterwaveService.getAllBanks(country);

    // safe haven
    if (country == 'NG') {
      return this.safeHavenService.getAllBanks();
    }
  }

  async getNameEquiry(bankCode: string, accountNumber: string) {
    return this.safeHavenService.getNameEquiry(bankCode, accountNumber);
  }

  async transferFund(body: TransferDto) {
    return this.flutterwaveService.initiateTransfer({
      account_bank: body.bankCode,
      account_number: body.accountNumber,
      amount: body.amount,
      currency: body.currency,
      debit_subaccount: body.debitSubaccountId,
    });
  }

  async transferVFDFund(
    body: TransferDto,
    type: 'intra' | 'inter',
    user: User & { wallet?: any },
  ) {
    return this.VFDBankService.transferFund({
      fromAccountNo: user?.wallet?.accountNumber,
      toAccountNo: body.accountNumber,
      toBankCode: body.bankCode,
      amount: String(body.amount),
      description: body.description,
      type,
    });
  }

  async transferSafeHavenFund(
    body: TransferDto,
    debitAccountNumber: string,
    trx_ref?: string,
  ) {
    return this.safeHavenService.transerFund({
      nameEnquiryReference: body?.sessionId,
      debitAccountNumber: this.configService.get<string>(
        'SAFEHAVE_DEBIT_ACCOUNT_NUMBER',
      ),
      beneficiaryBankCode: body?.bankCode,
      beneficiaryAccountNumber: body?.accountNumber,
      amount: body?.amount,
      narration: body?.description,
      paymentReference: trx_ref,
      saveBeneficiary: false,
      debitAccountInfo: {
        debitAccountNumber,
      },
    });
  }

  async getOperator(operatorId: number) {
    return this.reloadlyService.getOperator(operatorId);
  }

  async purchaseTopup(body: PayDto, email: string, trx_ref?: string) {
    return this.reloadlyService.payTopup({
      amount: body.amount,
      operatorId: body.operatorId,
      recipientEmail: email,
      customIdentifier: trx_ref,
      recipientPhone: {
        countryCode: this.getCountryCodeFromCurrency(body.currency),
        number: body.phone,
      },
    });
  }

  async purchaseGiftcard(
    body: GiftCardPayDto,
    email: string,
    trx_ref?: string,
  ) {
    return this.reloadlyService.orderGiftCard({
      customIdentifier: trx_ref,
      productId: body.productId,
      quantity: body.quantity,
      recipientEmail: email,
      senderName: 'NattyPay',
      unitPrice: body.unitPrice,
    });
  }

  async redeemGiftCard(transactionId: number) {
    return this.reloadlyService.redeemGiftCard(transactionId);
  }

  async purchaseBill(body: PayBillDto, trx_ref?: string) {
    return this.flutterwaveService.purchaseBill(
      body.itemCode,
      body.billerCode,
      {
        amount: body.amount,
        country: this.getCountryCodeFromCurrency(body.currency),
        customer_id: body.billerNumber,
        reference: trx_ref,
      },
    );
  }

  async purchaseBillWithIdentifier(
    body: PayBillDto,
    userId: string,
    trx_ref?: string,
  ) {
    return this.flutterwaveService.purchaseBill(
      body.itemCode,
      body.billerCode,
      {
        amount: body.amount,
        country: this.getCountryCodeFromCurrency(body.currency),
        customer_id: userId,
        reference: trx_ref,
      },
    );
  }

  async getGiftCardCategories() {
    return this.reloadlyService.getGiftCardCategories();
  }

  async getBillInfo(billerCode: string) {
    return this.flutterwaveService.getBillInfo(billerCode);
  }

  async verifyBillerNumber(body: VerifyBillerDto) {
    return this.flutterwaveService.verifyBillerNumber(body.itemCode, {
      code: body.billerCode,
      customer: body.billerNumber,
    });
  }

  async getProductByISOCode(currency: string) {
    const countrycode = this.getCountryCodeFromCurrency(currency);
    return this.reloadlyService.getGiftCardProductByISOCode(countrycode);
  }

  public getCountryCodeFromCurrency(currency: string): string | null {
    const currencyToCountryCode: Record<string, string> = {
      USD: 'US', // United States
      GBP: 'GB', // United Kingdom
      EUR: 'EU', // European Union
      NGN: 'NG', // Nigeria
      CAD: 'CA', // Canada
      AUD: 'AU', // Australia
      INR: 'IN', // India
      JPY: 'JP', // Japan
      CNY: 'CN', // China
      CHF: 'CH', // Switzerland
      ZAR: 'ZA', // South Africa
      SGD: 'SG', // Singapore
      NZD: 'NZ', // New Zealand
    };

    return currencyToCountryCode[currency] || null;
  }
}
