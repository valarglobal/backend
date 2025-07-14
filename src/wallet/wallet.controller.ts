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
import { WalletService } from './wallet.service';
import { Request } from 'express';
import { TransferDto } from './dto/TransferDto';
import {
  CURRENCY,
  TRANSACTION_CATEGORY,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} from '@prisma/client';
import { VerifyAccountDto } from './dto/VerifyAccountDto';
import { InitiateBvnVerificationDto } from './dto/InitiateBvnVerificationDto';
import { ValidateBvnVerificationDto } from './dto/ValidateBvnVerificationDto';
import { SmileIdBasicKycPayload } from 'src/api-providers/providers/smile-id.service';
import { DecodeQrCodeDto } from './dto/DecodeQrCodeDto';

@Controller('v1/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) { }

  @Get('get-banks')
  async getAllBanks(@Param('currency') currency: string) {
    return this.walletService.getAllBanks();
  }


  

  @Get('get-transfer-fee')
  async getTransferDetails(
    @Query('currency') currency: string,
    @Query('amount') amount: number,
    @Query('accountNumber') accountNumber: string,
  ) {
    return this.walletService.fetchTransferFee(currency, amount, accountNumber);
  }

  @Get('transaction')
  async getTransactions(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('type') type: TRANSACTION_TYPE,
    @Query('category') category: TRANSACTION_CATEGORY,
    @Query('status') status: TRANSACTION_STATUS,
    @Query('search') search: string,
    @Req() req: Request,
  ) {
    const user = req['user'];
    return this.walletService.getTransactions(
      page,
      limit,
      type,
      category,
      status,
      search,
      user,
    );
  }

  @Post('verify-account')
  @HttpCode(HttpStatus.OK)
  async verifyAccountNumber(@Body() body: VerifyAccountDto) {
    return this.walletService.verifyAccount(body);
  }

  @Post('initiate-transfer')
  @HttpCode(HttpStatus.OK)
  async initiateTransfer(@Body() body: TransferDto, @Req() req: Request) {
    const user = req['user'];
    return this.walletService.transferBellBankFund(body, user);
  }

  @Get('generate-qrcode')
  async generateQrCode(@Req() req: Request, @Query('amount') amount: number) {
    const user = req['user'];
    return this.walletService.generateQrCode(user, amount, CURRENCY.NGN);
  }

  @Post('decode-qrcode')
  async decodeQrCode(@Body() body: DecodeQrCodeDto) {
    return this.walletService.decodeQrCode(body.qrCode);
  }

  @Post('initiate-bvn-verification')
  async initiateBvnVerification(
    @Body() body: InitiateBvnVerificationDto,
    @Req() req: Request,
  ) {
    const user = req['user'];
    return this.walletService.initiateBvnVerification(body,user);
  }

  @Post('validate-bvn-verification')
  @HttpCode(HttpStatus.CREATED)
  async ValidateBvnVerification(
    @Body() body: ValidateBvnVerificationDto,
    @Req() req: Request,
  ) {
    const user = req['user'];
    return this.walletService.validateBvnVerification(body, user);
  }
}
