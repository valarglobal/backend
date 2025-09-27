import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/RegisterDto';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/email/email.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from '../user/serializer/user.serializer';
import { plainToInstance } from 'class-transformer';
import { VerifyEmailDto } from './dto/VerifyEmailDto';
import { EmailDto } from './dto/EmailDto';
import { LoginDto } from './dto/LoginDto';
import { PasscodeDto } from './dto/PasscodeDto';
import { ACCOUNT_TYPE, User } from '@prisma/client';
import { PasscodeLoginDto } from './dto/PasscodeLoginDto';
import { ResetPasswordDto } from './dto/ResetPasswordDto';
import { RegisterBusinessDto } from './dto/RegisterBusinessDto';
import { REFERRAL_BONUS_PRICE } from 'src/constants';

@Injectable()
export class AuthService {
  private readonly BCRYPT_SALT_ROUNDS = 12;
  private readonly OTP_EXPIRES_IN = '10m';
  private readonly ACCESS_TOKEN_EXPIRES_IN = '1h';
  private readonly JWT_SECRET_KEY = 'JWT_SECRET'; // config key

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /* =====================
     Public methods
     ===================== */

  async register(body: RegisterDto | RegisterBusinessDto) {
    const otpCode = this.generateOtp(6);

    return this.prisma
      .$transaction(async (tx) => {
        // Lock check for existing user (email or username)
        const existingUser = (await tx.$queryRaw`
        SELECT * FROM "users"
        WHERE "email" = ${body.email} OR "username" = ${body.username}
        FOR UPDATE
        LIMIT 1
      `) as User[];

        if (existingUser.length > 0) {
          if (existingUser[0].email === body.email) {
            throw new BadRequestException('User with email already exists');
          }
          throw new BadRequestException('Username is already taken');
        }

        const hashedPassword = await bcrypt.hash(
          String(body.password),
          this.BCRYPT_SALT_ROUNDS,
        );

        const payload: any = {
          fullname: body.fullname,
          username: body.username,
          email: body.email,
          password: hashedPassword,
          referralCode: await this.generateReferralCode(),
          dateOfBirth: body.dateOfBirth,
          accountType: body.accountType,
          isBusiness: body.accountType === ACCOUNT_TYPE.BUSINESS,
          currency: body.currency ?? 'NGN',
          companyRegistrationNumber:
            body.accountType === ACCOUNT_TYPE.BUSINESS
              ? (body as RegisterBusinessDto)?.companyRegistrationNumber
              : '',
        };

        // handle referral code (if provided)
        if (body.referralCode) {
          const referredUser = await tx.user.findFirst({
            where: { referralCode: body.referralCode },
            include: { wallet: true },
          });

          if (!referredUser)
            throw new BadRequestException('Invalid referral code');

          const referredUserWallet = referredUser.wallet.find(
            (w) => w.currency === body.currency,
          );

          if (!referredUserWallet) {
            throw new BadRequestException('Invalid referral code');
          }

          await tx.wallet.update({
            where: { id: referredUserWallet.id },
            data: {
              balance: referredUserWallet.balance + REFERRAL_BONUS_PRICE,
            },
          });

          payload.referredBy = referredUser.id;
        }

        // create user
        const newUser = await tx.user.create({
          data: payload,
        });

        // sign otp token and save
        const otpToken = await this.createOtpToken(newUser.id, otpCode);
        await tx.user.update({
          where: { id: newUser.id },
          data: { otpToken },
        });

        // return created user (then block will send mails)
        return newUser;
      })
      .then((savedUser) => {
        // best-effort send emails (do not fail registration if email sending fails)
        this.sendEmailSafe({
          to: savedUser.email,
          subject: 'Welcome to valarpay',
          template: 'auth/welcome-email.hbs',
          context: { firstName: savedUser.fullname.split(' ')[0] },
        });

        this.sendEmailSafe({
          to: savedUser.email,
          subject: 'Verify Your Email Address',
          template: 'auth/verify-email.hbs',
          context: { otpCode: otpCode, year: new Date().getFullYear() },
        });

        return {
          message: 'User created successfully',
          user: plainToInstance(UserEntity, savedUser),
          statusCode: HttpStatus.OK,
        };
      });
  }

  async login(body: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { username: body.email }] },
    });

    if (!user) throw new BadRequestException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(body.password, user.password);
    if (!isPasswordValid)
      throw new BadRequestException('Invalid email or password');

    const otpCode = this.generateOtp(6);
    const otpToken = await this.createOtpToken(user.id, otpCode);

    console.log('login otp for ' + body.email + ' is ' + otpCode);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpToken },
    });

    if (!user.isEmailVerified) {
      // send verification email
      this.sendEmailSafe({
        to: user.email,
        subject: 'Verify Your Email Address',
        template: 'auth/verify-email.hbs',
        context: { otpCode, year: new Date().getFullYear() },
      });

      throw new BadRequestException('Email not verified');
    }

    let accessToken: string | undefined;
    if (user.enabledTwoFa) {
      // send 2FA code
      this.sendEmailSafe({
        to: user.email,
        subject: 'Your Login Verification Code - Valarpay',
        template: 'auth/2fa-email.hbs',
        context: { firstName: user.fullname.split(' ')[0], otpCode },
      });
    } else {
      // create access token & update token version
      const currentTokenVersion = this.incrementTokenVersion(user);
      const jwtPayload = {
        sub: user.id,
        email: user.email,
        version: currentTokenVersion,
      };

      await this.prisma.user.update({
        where: { id: user.id },
        data: { tokenVersion: currentTokenVersion },
      });

      accessToken = await this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get(this.JWT_SECRET_KEY),
        expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      });
    }

    // optional login notification
    if (body.deviceName && body.ipAddress && body.operatingSystem) {
      this.sendEmailSafe({
        to: user.email,
        subject: 'New Login Detected on Your Valarpay Account',
        template: 'auth/login-email.hbs',
        context: {
          fullname: user.fullname,
          formattedDateTime: this.formatDateTime(new Date()),
          deviceName: body.deviceName,
          ipAddress: body.ipAddress,
          operatingSystem: body.operatingSystem,
          year: new Date().getFullYear(),
        },
      });
    }

    return {
      message: 'Login successful',
      user: plainToInstance(UserEntity, user),
      statusCode: HttpStatus.OK,
      accessToken,
    };
  }

  async verifyEmail(body: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });
    if (!user) throw new BadRequestException('User with email does not exist');
    if (user.isEmailVerified)
      throw new BadRequestException('Email already verified');

    const payload = await this.verifyOtpTokenSafe(user?.otpToken);
    if (payload?.otpCode !== body.otpCode)
      throw new BadRequestException('Invalid verification code');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    return {
      message: 'Email verified successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async resendVerifyEmail(body: EmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });
    if (!user) throw new BadRequestException('User with email does not exist');

    const otpCode = this.generateOtp(6);
    const otpToken = await this.createOtpToken(user.id, otpCode);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpToken },
    });

    this.sendEmailSafe({
      to: user.email,
      subject: 'Verify your email',
      template: 'auth/verify-email.hbs',
      context: { otpCode: otpCode, year: new Date().getFullYear() },
    });

    return {
      message: 'Email verification code resent',
      statusCode: HttpStatus.OK,
    };
  }

  async resendTwoFaEmail(body: EmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });
    if (!user) throw new BadRequestException('User with email does not exist');

    const twoFaCode = this.generateOtp(6);
    const otpToken = await this.createOtpToken(user.id, twoFaCode);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpToken },
    });

    this.sendEmailSafe({
      to: user.email,
      subject: 'Your Login Verification Code - Valarpay',
      template: 'auth/2fa-email.hbs',
      context: { firstName: user.fullname.split(' ')[0], otpCode: twoFaCode },
    });

    return { message: '2FA email resent', statusCode: HttpStatus.OK };
  }

  async verifyTwoFaCode(body: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });
    if (!user) throw new BadRequestException('User with email does not exist');

    const payload = await this.verifyOtpTokenSafe(user?.otpToken);
    if (payload?.otpCode !== body.otpCode)
      throw new BadRequestException('Invalid OTP code');

    const currentTokenVersion = this.incrementTokenVersion(user);
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      version: currentTokenVersion,
    };

    await this.prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: currentTokenVersion },
    });

    const accessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get(this.JWT_SECRET_KEY),
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    });

    return {
      message: '2FA verified successfully',
      statusCode: HttpStatus.OK,
      user: plainToInstance(UserEntity, user),
      accessToken,
    };
  }

  async createPasscode(body: PasscodeDto, user: User) {
    const hashedPasscode = await bcrypt.hash(
      String(body.passcode),
      this.BCRYPT_SALT_ROUNDS,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passcode: hashedPasscode, isPasscodeSet: true },
    });

    return {
      message: 'Passcode created successfully',
      statusCode: HttpStatus.OK,
    };
  }

  async passcodeLogin(body: PasscodeLoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });
    if (!user) throw new BadRequestException('User with email does not exist');
    if (!user.isPasscodeSet) throw new BadRequestException('Passcode not set');

    const isPasscodeValid = await bcrypt.compare(body.passcode, user.passcode);
    if (!isPasscodeValid) throw new BadRequestException('Invalid passcode');

    const currentTokenVersion = this.incrementTokenVersion(user);
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      version: currentTokenVersion,
    };

    await this.prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: currentTokenVersion },
    });

    const accessToken = await this.jwtService.signAsync(jwtPayload, {
      secret: this.configService.get(this.JWT_SECRET_KEY),
      expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
    });

    if (body.deviceName && body.ipAddress && body.operatingSystem) {
      this.sendEmailSafe({
        to: user.email,
        subject: 'New Login Detected on Your Valarpay Account',
        template: 'auth/login-email.hbs',
        context: {
          fullname: user.fullname,
          formattedDateTime: this.formatDateTime(new Date()),
          deviceName: body.deviceName,
          ipAddress: body.ipAddress,
          operatingSystem: body.operatingSystem,
          year: new Date().getFullYear(),
        },
      });
    }

    return {
      message: 'Passcode login successful',
      statusCode: HttpStatus.OK,
      user: plainToInstance(UserEntity, user),
      accessToken,
    };
  }

  async resetPassword(body: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });
    if (!user) throw new BadRequestException('User with email does not exist');

    if (body.password !== body.confirmPassword)
      throw new BadRequestException('Passwords do not match');

    const hashedPassword = await bcrypt.hash(
      String(body.password),
      this.BCRYPT_SALT_ROUNDS,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { message: 'Password reset successful', statusCode: HttpStatus.OK };
  }

  async forgotPassword(body: EmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });
    if (!user) throw new BadRequestException('User with email does not exist');

    const otpCode = this.generateOtp(4);
    const otpToken = await this.createOtpToken(user.id, otpCode);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { otpToken },
    });

    this.sendEmailSafe({
      to: user.email,
      subject: 'Reset Your Password - Valarpay',
      template: 'auth/forgot-password-email.hbs',
      context: { otpCode },
    });

    return { message: 'Password reset email sent', statusCode: HttpStatus.OK };
  }

  async verifyForgotPassword(body: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });
    if (!user) throw new BadRequestException('User with email does not exist');

    const payload = await this.verifyOtpTokenSafe(user?.otpToken);
    if (payload?.otpCode !== body.otpCode)
      throw new BadRequestException('Invalid OTP code');

    return {
      message: 'OTP code verified successfully',
      statusCode: HttpStatus.OK,
    };
  }

  /* =====================
     Private helpers
     ===================== */

  private generateOtp(length: number): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  private async generateReferralCode(): Promise<string> {
    const CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    while (true) {
      let code = '';
      for (let i = 0; i < 6; i++)
        code += CHAR[Math.floor(Math.random() * CHAR.length)];

      const isTaken = await this.prisma.user.findFirst({
        where: { referralCode: code },
      });
      if (!isTaken) return code;
      // else loop again
    }
  }

  private incrementTokenVersion(user: User): number {
    const MAX_INT = 2147483647;
    return user.tokenVersion >= MAX_INT ? 0 : user.tokenVersion + 1;
  }

  private formatDateTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleString('en-US', options);
  }

  private async createOtpToken(
    userId: string,
    otpCode: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, otpCode },
      {
        secret: this.configService.get(this.JWT_SECRET_KEY),
        expiresIn: this.OTP_EXPIRES_IN,
      },
    );
  }

  private async verifyOtpTokenSafe(token?: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token ?? '', {
        secret: this.configService.get(this.JWT_SECRET_KEY),
      });
    } catch (err) {
      throw new BadRequestException('Expired OTP code');
    }
  }

  private sendEmailSafe(mailOptions: {
    to: string;
    subject: string;
    template: string;
    context?: any;
  }) {
    try {
      this.emailService.sendEmail(mailOptions as any);
    } catch (error) {
      // Log and swallow so we don't break main flow
      console.log(`Error sending email to ${mailOptions.to}`, error);
    }
  }

  private async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { email } });
  }
}
