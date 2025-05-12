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
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(body: RegisterDto | RegisterBusinessDto) {
    const otpCode = this.generateOtp(6);

    return this.prisma
      .$transaction(async (tx) => {
        const existingUser: User[] = await tx.$queryRaw`
            SELECT * FROM "users" 
            WHERE "email" = ${body.email} OR "username" = ${body.username} 
            FOR UPDATE
            LIMIT 1
          `;

        if (existingUser.length > 0) {
          if (existingUser[0].email === body.email) {
            throw new BadRequestException('User with email already exists');
          }
          throw new BadRequestException('Username is already taken');
        }

        const password = body.password;

        const hashedPassword = await bcrypt.hash(password, 12);

        const payload: any = {
          fullname: body.fullname,
          username: body.username,
          email: body.email,
          password: hashedPassword,
          referralCode: await this.generateReferralCode(),
          dateOfBirth: body.dateOfBirth,
          accountType: body.accountType,
          isBusiness: body.accountType === ACCOUNT_TYPE.BUSINESS ? true : false,
          currency: body.currency ?? 'NGN',
          companyRegistrationNumber:
            body.accountType === ACCOUNT_TYPE.BUSINESS
              ? (body as RegisterBusinessDto)?.companyRegistrationNumber
              : '',
        };

        if (body.referralCode) {
          const referredUser = await this.prisma.user.findFirst({
            where: {
              referralCode: body.referralCode,
            },
            include: {
              wallet: true,
            },
          });

          if (!referredUser)
            throw new BadRequestException('Invalid referral code');

          const referredUserWallet = referredUser.wallet.find(
            (wallet) => wallet.currency === body.currency,
          );

          if (!referredUserWallet) {
            throw new BadRequestException('Invalid referral code');
          }

          await tx.wallet.update({
            where: {
              id: referredUserWallet.id,
            },
            data: {
              balance: referredUserWallet.balance + REFERRAL_BONUS_PRICE,
            },
          });

          payload.referredBy = referredUser?.id;
        }

        const newUser = await tx.user.create({
          data: payload,
        });

        const otpToken = await this.jwtService.signAsync(
          {
            sub: newUser?.id,
            otpCode: otpCode,
          },
          {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '10m',
          },
        );

        await tx.user.update({
          where: { id: newUser.id },
          data: {
            otpToken,
          },
        });

        return newUser;
      })
      .then((savedUser) => {
        try {
          // send welcome email
          this.emailService.sendEmail({
            to: savedUser.email,
            subject: 'Welcome to valarpay',
            template: 'auth/welcome-email.hbs',
            context: { firstName: savedUser.fullname.split(' ')[0] },
          });
        } catch (error) {
          console.log('Error sending welcome email', error);
        }

        try {
          //send verification email
          this.emailService.sendEmail({
            to: savedUser.email,
            subject: 'Verify Your Email Address',
            template: 'auth/verify-email.hbs',
            context: { otpCode: otpCode, year: new Date().getFullYear() },
          });
        } catch (error) {
          console.log('Error sending verification email', error);
        }

        return {
          message: 'User created successfully',
          user: plainToInstance(UserEntity, savedUser),
          statusCode: HttpStatus.OK,
        };
      });
  }

  async login(body: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.email }],
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    const password = body.password;

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

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

    if (!user.isEmailVerified) {
      // send user a mail to verify thier email
      try {
        //send verification email
        this.emailService.sendEmail({
          to: user.email,
          subject: 'Verify Your Email Address',
          template: 'auth/verify-email.hbs',
          context: { otpCode, year: new Date().getFullYear() },
        });
      } catch (error) {
        console.log('Error sending verification email', error);
      }

      throw new BadRequestException('Email not verified');
    }

    let accessToken: string;
    if (user.enabledTwoFa) {
      try {
        // send 2fa email
        this.emailService.sendEmail({
          to: user.email,
          subject: 'Your Login Verification Code - Valarpay',
          template: 'auth/2fa-email.hbs',
          context: { firstName: user.fullname.split(' ')[0], otpCode },
        });
      } catch (error) {
        console.log('error sending 2fa email', error);
      }
    } else {
      const currentTokenVersion = this.getCurrentVersion(user);
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
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '1h',
      });
    }

    if (body.deviceName && body.ipAddress && body.operatingSystem) {
      try {
        this.emailService.sendEmail({
          to: user.email,
          subject: 'New Login Detected on Your Valarpay Account',
          template: 'auth/login-email.hbs',
          context: {
            fullname: user?.fullname,
            formattedDateTime: this.formatDateTime(new Date()),
            deviceName: body.deviceName,
            ipAddress: body.ipAddress,
            operatingSystem: body.operatingSystem,
            year: new Date().getFullYear(),
          },
        });
      } catch (error) {
        console.log('error sending login email', error);
      }
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

    if (!user) {
      throw new BadRequestException('User with email does not exist');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(user?.otpToken, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch (error) {
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    if (payload?.otpCode !== body.otpCode) {
      throw new BadRequestException('Invalid verification code');
    }

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

    if (!user) {
      throw new BadRequestException('User with email does not exist');
    }
    const otpCode = this.generateOtp(6);

    const otpToken = await this.jwtService.signAsync(
      {
        sub: user?.id,
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
      //send verification email
      this.emailService.sendEmail({
        to: user.email,
        subject: 'Verify your email',
        template: 'auth/verify-email.hbs',
        context: { otpCode: otpCode, year: new Date().getFullYear() },
      });
    } catch (error) {
      console.log('error sending verification email', error);
    }

    return {
      message: 'Email verification code resent',
      statusCode: HttpStatus.OK,
    };
  }

  async resendTwoFaEmail(body: EmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) {
      throw new BadRequestException('User with email does not exist');
    }

    const twoFaCode = this.generateOtp(6);

    const otpToken = await this.jwtService.signAsync(
      {
        sub: user?.id,
        otpCode: twoFaCode,
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
      // send 2fa email
      this.emailService.sendEmail({
        to: user.email,
        subject: 'Your Login Verification Code - Valarpay',
        template: 'auth/2fa-email.hbs',
        context: {
          firstName: user.fullname.split(' ')[0],
          otpCode: twoFaCode,
        },
      });
    } catch (error) {
      console.log('error sending 2fa email', error);
    }

    return {
      message: '2FA email resent',
      statusCode: HttpStatus.OK,
    };
  }

  async verifyTwoFaCode(body: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) {
      throw new BadRequestException('User with email does not exist');
    }

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

    const currentTokenVersion = this.getCurrentVersion(user);
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
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '1h',
    });

    return {
      message: '2FA verified successfully',
      statusCode: HttpStatus.OK,
      user: plainToInstance(UserEntity, user),
      accessToken,
    };
  }

  async createPasscode(body: PasscodeDto, user: User) {
    const hashedPasscode = await bcrypt.hash(body.passcode, 12);

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

    if (!user) {
      throw new BadRequestException('User with email does not exist');
    }

    if (!user.isPasscodeSet) {
      throw new BadRequestException('Passcode not set');
    }

    const isPasscodeValid = await bcrypt.compare(body.passcode, user.passcode);

    if (!isPasscodeValid) {
      throw new BadRequestException('Invalid passcode');
    }

    const currentTokenVersion = this.getCurrentVersion(user);
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
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '1h',
    });

    if (body.deviceName && body.ipAddress && body.operatingSystem) {
      try {
        this.emailService.sendEmail({
          to: user.email,
          subject: 'New Login Detected on Your Valarpay Account',
          template: 'auth/login-email.hbs',
          context: {
            fullname: user?.fullname,
            formattedDateTime: this.formatDateTime(new Date()),
            deviceName: body.deviceName,
            ipAddress: body.ipAddress,
            operatingSystem: body.operatingSystem,
            year: new Date().getFullYear(),
          },
        });
      } catch (error) {
        console.log('error sending login email', error);
      }
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

    if (!user) {
      throw new BadRequestException('User with email does not exist');
    }

    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return {
      message: 'Password reset successful',
      statusCode: HttpStatus.OK,
    };
  }

  async forgotPassword(body: EmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) {
      throw new BadRequestException('User with email does not exist');
    }

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
        subject: 'Reset Your Password - Valarpay',
        template: 'auth/forgot-password-email.hbs',
        context: { otpCode: otpCode },
      });
    } catch (error) {
      console.log('error sending forgot password email', error);
    }

    return {
      message: 'Password reset email sent',
      statusCode: HttpStatus.OK,
    };
  }

  async verifyForgotPassword(body: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
    });

    if (!user) {
      throw new BadRequestException('User with email does not exist');
    }

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

    return {
      message: 'OTP code verified successfully',
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

  private async generateReferralCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let newReferralCode = '';
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      newReferralCode += characters[randomIndex];
    }

    const isTaken = await this.prisma.user.findFirst({
      where: {
        referralCode: newReferralCode,
      },
    });

    if (isTaken) return await this.generateReferralCode();

    return newReferralCode;
  }

  private getCurrentVersion(user: User) {
    const MAX_INT = 2147483647;

    let currentTokenVersion: number;
    if (user.tokenVersion >= MAX_INT) {
      currentTokenVersion = 0;
    } else {
      currentTokenVersion = user.tokenVersion + 1;
    }

    return currentTokenVersion;
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
}
