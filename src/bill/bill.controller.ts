import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { BillService } from './bill.service';
import { PayDto } from './dto/PayDto';
import { GiftCardPayDto } from './dto/GiftCardPayDto';
import { VerifyBillerDto } from './dto/VerifyBillerDto';
import { PayBillDto } from './dto/PayBillDto';
import { NETWORK } from '@prisma/client';

@Controller('/v1/bill')
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Get('airtime/get-plan')
  async getAirtimePlan(
    @Query('phone') phone: number,
    @Query('currency') currency: string,
  ) {
    return this.billService.getAirtimePlan(phone, currency);
  }

  @Get('airtime/network-providers')
  async getAirtimeNetworkProviders() {
    return this.billService.getAirtimeNetworkProviders();
  }

  @Get('data/get-plan/:network')
  async getDataNetworkProviders(@Param('network') network: string) {
    return this.billService.getDataPlanByNetwork(network);
  }

  @Get('data/get-plan')
  async getDataPlan(
    @Query('phone') phone: number,
    @Query('currency') currency: string,
  ) {
    return this.billService.getDataPlan(phone, currency);
  }

  @Get('cable/get-plan')
  async getCabelPlan(@Query('currency') currency: string) {
    return this.billService.getCablePlan(currency);
  }

  @Get('electricity/get-plan')
  async getElectricityPlan(@Query('currency') currency: string) {
    return this.billService.getElectricityPlan(currency);
  }

  @Get('internet/get-plan')
  async getInternetPlan(@Query('currency') currency: string) {
    return this.billService.getInternetPlan(currency);
  }

  @Get('transport/get-plan')
  async getTransportPlan(@Query('currency') currency: string) {
    return this.billService.getTransportPlan(currency);
  }

  @Get('school/get-plan')
  async getSchoolfeePlan(@Query('currency') currency: string) {
    return this.billService.getSchoolfeePlan(currency);
  }

  @Get('airtime/get-variation')
  async getAirtimeVariation(@Query('operatorId') operatorId: number) {
    return this.billService.getVariation(operatorId);
  }

  @Get('data/get-variation')
  async getDataVariation(@Query('operatorId') operatorId: number) {
    return this.billService.getVariation(operatorId);
  }

  @Post('data/pay')
  @HttpCode(HttpStatus.OK)
  async dataPay(@Body() body: PayDto, @Req() req: Request) {
    const user = req['user'];
    return this.billService.pay(body, user, 'data');
  }

  @Post('airtime/pay')
  @HttpCode(HttpStatus.OK)
  async airtimePay(@Body() body: PayDto, @Req() req: Request) {
    const user = req['user'];
    return this.billService.pay(body, user, 'airtime');
  }

  @Get('giftcard/get-categories')
  async getGiftCardCategories() {
    return this.billService.getGiftCardCategories();
  }

  @Get('giftcard/get-product')
  async getProductByISOCode(@Query('currency') currency: string) {
    return this.billService.getProductByISOCode(currency);
  }

  @Get('cable/get-bill-info')
  async getCableBillInfo(@Query('billerCode') billerCode: string) {
    return this.billService.getBillInfo(billerCode, 'cable');
  }

  @Get('electricity/get-bill-info')
  async getElectricityBillInfo(@Query('billerCode') billerCode: string) {
    return this.billService.getBillInfo(billerCode, 'electricity');
  }

  @Get('internet/get-bill-info')
  async getInternetBillInfo(@Query('billerCode') billerCode: string) {
    return this.billService.getBillInfo(billerCode, 'internet');
  }

  @Get('transport/get-bill-info')
  async getTransportBillInfo(@Query('billerCode') billerCode: string) {
    return this.billService.getBillInfo(billerCode, 'transport');
  }

  @Get('school/get-bill-info')
  async getSchoolfeeBillInfo(@Query('billerCode') billerCode: string) {
    return this.billService.getBillInfo(billerCode, 'schoolfee');
  }

  @Post('cable/verify-cable-number')
  async verifyCableNumber(@Body() body: VerifyBillerDto) {
    return this.billService.verifyBillerNumber(body, 'cable');
  }

  @Post('electricity/verify-meter-number')
  async verifyMeterNumber(@Body() body: VerifyBillerDto) {
    return this.billService.verifyBillerNumber(body, 'electricity');
  }

  @Post('cable/pay')
  async cablePay(@Body() body: PayBillDto, @Req() req: Request) {
    const user = req['user'];
    return this.billService.pay(body, user, 'cable');
  }

  @Post('electricity/pay')
  async electricityPay(@Body() body: PayBillDto, @Req() req: Request) {
    const user = req['user'];
    return this.billService.pay(body, user, 'electricity');
  }

  @Post('giftcard/pay')
  async giftcardPay(@Body() body: GiftCardPayDto, @Req() req: Request) {
    const user = req['user'];
    return this.billService.pay(body, user, 'giftcard');
  }

  @Get('giftcard/get-redeem-code')
  async getGiftCardRedeemCode(@Query('transactionId') transactionId: number) {
    return this.billService.redeemGiftCard(transactionId);
  }

  @Post('internet/pay')
  async internetPay(@Body() body: GiftCardPayDto, @Req() req: Request) {
    const user = req['user'];
    return this.billService.pay(body, user, 'giftcard');
  }

  @Post('transport/pay')
  async transportPay(@Body() body: PayBillDto, @Req() req: Request) {
    const user = req['user'];
    return this.billService.pay(body, user, 'transport');
  }

  @Post('school/pay')
  async schoolfeePay(@Body() body: PayBillDto, @Req() req: Request) {
    const user = req['user'];
    return this.billService.pay(body, user, 'schoolfee');
  }
}
