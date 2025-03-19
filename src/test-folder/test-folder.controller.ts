import { Body, Controller, Get, Post } from '@nestjs/common';
import { CURRENCY } from '@prisma/client';
import { VFDBankService } from 'src/api-providers/providers/VFDBank.service';
import { TermiiService } from 'src/api-providers/providers/termii.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('v1/test-folder')
export class TestFolderController {
  constructor(
    private readonly VFDBankService: VFDBankService,
    private readonly prisma: PrismaService,
    private readonly TermiiService: TermiiService,
  ) {}

  @Post('test-route')
  async testRoute(@Body() body: any) {
    return this.prisma.wallet.create({
      data: {
        userId: body?.userId,
        currency: CURRENCY.NGN,
        accountNumber: body?.accountNumber,
        bankName: body?.bankName,
        accountName: body?.accountName,
      },
    });
    // return this.prisma.wallet.update({
    //   where: {
    //     id: 'a6991eeb-2132-4b8d-9544-86a9a337c06a',
    //   },
    //   data: {
    //     balance: 10000,
    //   },
    // });
  }

  @Post('create-account')
  async createAccount(@Body() body: any) {
    return this.VFDBankService.createNoConsentVirtualAccount({
      bvn: body?.bvn,
      dateOfBirth: body?.dateOfBirth,
    });
  }

  @Post('credit-account')
  async creditAccount(@Body() body: any) {
    return this.VFDBankService.creditVirtualAccount({
      amount: body.amount,
      accountNo: body.accountNumber,
      senderAccountNo: body.senderAccountNumber,
      senderBank: body.senderBank,
      senderNarration: 'Test credit',
    });
  }

  @Get('get-banks')
  async getbanks() {
    return this.VFDBankService.getBankList();
  }

  @Post('send-sms')
  async setSms(@Body() body: any) {
    try {
      return await this.TermiiService.sendSms({
        phoneNumber: body.phoneNumber,
        message:
          'Your NattyPay verification is 7548.valid for 10 minutes, Do not share this code with anyone, thank you',
      });
    } catch (error) {
      console.log('error from send-sms', error);
    }
  }
}
