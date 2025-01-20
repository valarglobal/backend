import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { WalletPinDto } from './dto/WalletPinDto';
import { Request } from 'express';
import { ChangePinDto } from './dto/ChangePinDto';
import { CreateAccountDto } from './dto/CreateAccountDto';
import { ChangePasscodeDto } from './dto/ChangePasscodeDto';
import { UserEntity } from 'src/user/serializer/user.serializer';
import { FileInterceptor } from '@nestjs/platform-express';
import { EditProfileDto } from './dto/EditProfileDto';
import { multerOptions } from 'src/config/multer.config';
import { ChangePasswordDto } from './dto/ChangePasswordDto';
import { ResetWalletPinDto } from './dto/ResetWalletPinDto';
import { CreateForeignAccountDto } from './dto/CreateForeignAccountDto';
import { KycTier2Dto } from './dto/KycTier2Dto';
import { NinDto } from './dto/NinDto';
import { ReportScamDto } from './dto/ReportScamDto';
import { CreateBusinessAccountDto } from './dto/CreateBusinessAccountDto';
import { KycTier3Dto } from './dto/KycTier3Dto';
import { PhoneDto } from './dto/PhoneDto';

@Controller('v1/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Put('edit-profile')
  @UseInterceptors(FileInterceptor('profile-image', multerOptions('profile')))
  async changeProfileImage(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: EditProfileDto,
    @Req() req: Request,
  ): Promise<any> {
    const user = req['user'];
    return this.userService.editProfile(body, user, file);
  }

  @Post('report-scam')
  @UseInterceptors(FileInterceptor('screenshot', multerOptions('report-scam')))
  async reportScam(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: ReportScamDto,
    @Req() req: Request,
  ): Promise<any> {
    const user = req['user'];
    return this.userService.reportScam(body, user, file);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Get('me')
  async getDetails(@Req() req: Request) {
    const user = req['user'];
    return new UserEntity(user);
  }

  @Post('set-wallet-pin')
  async setWalletPin(@Body() body: WalletPinDto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.setWalletPin(body, user);
  }

  @Post('verify-wallet-pin')
  @HttpCode(HttpStatus.OK)
  async verifyWalletPin(@Body() body: WalletPinDto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.verifyWalletPin(body, user);
  }

  @Post('verify-nin')
  @HttpCode(HttpStatus.OK)
  async VerifyNin(@Body() body: NinDto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.verifyNinDetails(body.nin, user);
  }

  @Post('verify-phone')
  @HttpCode(HttpStatus.OK)
  async VerifPhoneNumber(@Body() body: PhoneDto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.verifyPhoneNumber(body.phone, user);
  }

  @Post('forget-pin')
  async forgetPin(@Req() req: Request) {
    const user = req['user'];
    return this.userService.forgetPin(user);
  }

  @Post('reset-pin')
  async resetPin(@Body() body: ResetWalletPinDto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.resetPin(body, user);
  }

  @Put('change-pin')
  async changePin(@Body() body: ChangePinDto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.changePin(body, user);
  }

  @Put('change-password')
  async changePassword(@Body() body: ChangePasswordDto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.changePassword(body, user);
  }

  @Put('change-passcode')
  async changePasscode(@Body() body: ChangePasscodeDto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.changePasscode(body, user);
  }

  @Post('create-account')
  async createAccount(@Body() body: CreateAccountDto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.createAccount(body?.bvn, user);
  }

  @Post('create-business-account')
  async createBusinessAccount(
    @Body() body: CreateBusinessAccountDto,
    @Req() req: Request,
  ) {
    const user = req['user'];
    return this.userService.createBusinessAccount(body, user);
  }

  @Post('create-foreign-account')
  async createForeignAccount(
    @Body() body: CreateForeignAccountDto,
    @Req() req: Request,
  ) {
    const user = req['user'];
    return this.userService.createForeignAccount(body.currency, user);
  }

  @Delete('/:id')
  async deleteAccount(@Param('id') userId: string) {
    return this.userService.deleteUserAccount(userId);
  }

  @Post('kyc-tier2')
  @HttpCode(HttpStatus.OK)
  async verifyTier2Kyc(@Body() body: KycTier2Dto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.verifyTier2Kyc(body, user);
  }

  @Post('kyc-tier3')
  @HttpCode(HttpStatus.OK)
  async verifyTier3Kyc(@Body() body: KycTier3Dto, @Req() req: Request) {
    const user = req['user'];
    return this.userService.verifyTier3Kyc(body, user);
  }
}
