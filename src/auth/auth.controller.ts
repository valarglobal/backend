import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/RegisterDto';
import { VerifyEmailDto } from './dto/VerifyEmailDto';
import { EmailDto } from './dto/EmailDto';
import { LoginDto } from './dto/LoginDto';
import { PasscodeDto } from './dto/PasscodeDto';
import { Request } from 'express';
import { PasscodeLoginDto } from './dto/PasscodeLoginDto';
import { ResetPasswordDto } from './dto/ResetPasswordDto';
import { RegisterBusinessDto } from './dto/RegisterBusinessDto';

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('register-business')
  @HttpCode(HttpStatus.CREATED)
  async registerBusinessAccount(@Body() body: RegisterBusinessDto) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyEmailDto) {
    return this.authService.verifyEmail(body);
  }

  @Post('resend-verify-email')
  async resendVerifyEmail(@Body() body: EmailDto) {
    return this.authService.resendVerifyEmail(body);
  }

  @Post('resend-2fa-email')
  async resendTwoFaEmail(@Body() body: EmailDto) {
    return this.authService.resendTwoFaEmail(body);
  }

  @Post('verify-2fa-code')
  async verifyTwoFaCode(@Body() body: VerifyEmailDto) {
    return this.authService.verifyTwoFaCode(body);
  }

  @Post('create-passcode')
  async createPasscode(@Body() body: PasscodeDto, @Req() req: Request) {
    const user = req['user'];
    return this.authService.createPasscode(body, user);
  }

  @Post('passcode-login')
  async passcodeLogin(@Body() body: PasscodeLoginDto) {
    return this.authService.passcodeLogin(body);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: EmailDto) {
    return this.authService.forgotPassword(body);
  }

  @Post('verify-forgot-password')
  async verifyForgotPassword(@Body() body: VerifyEmailDto) {
    return this.authService.verifyForgotPassword(body);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }
}
