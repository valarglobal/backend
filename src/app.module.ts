import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import * as Joi from 'joi';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email/email.module';
import { JwtMiddleware } from './middlewares/JwtMiddleware';
import { ApiKeyMiddleware } from './middlewares/ApiKeyMiddleware';
import { UserModule } from './user/user.module';
import { ApiProvidersModule } from './api-providers/api-providers.module';
import { WebhookModule } from './webhook/webhook.module';
import { WalletModule } from './wallet/wallet.module';
import { BillModule } from './bill/bill.module';
import { AdminModule } from './admin/admin.module';
import { TestFolderModule } from './test-folder/test-folder.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        SMTP_HOST: Joi.string().required(),
        SMTP_PORT: Joi.number().required(),
        SMTP_USER: Joi.string().required(),
        SMTP_PASS: Joi.string().required(),
        SMTP_FROM: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        API_KEY: Joi.string().required(),
        CLOUDINARY_CLOUD_NAME: Joi.string().required(),
        CLOUDINARY_API_KEY: Joi.string().required(),
        CLOUDINARY_API_SECRET: Joi.string().required(),
        FLUTTERWAVE_PUBLIC_KEY: Joi.string().required(),
        FLUTTERWAVE_SECRET_KEY: Joi.string().required(),
        FLUTTERWAVE_BASE_URL: Joi.string().required(),
        FLUTTERWAVE_SECRET_HASH: Joi.string().required(),
        DOJAH_BASE_URL: Joi.string().required(),
        DOJAH_APPID: Joi.string().required(),
        DOJAH_SECRET_KEY: Joi.string().required(),
        DOJAH_PUBLIC_KEY: Joi.string().required(),
        RELOADLY_CLIENT_ID: Joi.string().required(),
        RELOADLY_SECRET_KEY: Joi.string().required(),
        SAFEHAVEN_BASE_URL: Joi.string().required(),
        SAFEHAVEN_CLIENT_ASSERTION: Joi.string().required(),
        SAFEHAVEN_CLIENT_ID: Joi.string().required(),
        SAFEHAVE_DEBIT_ACCOUNT_NUMBER: Joi.string().required(),
      }),
    }),
    PrismaModule,
    AuthModule,
    EmailModule,
    UserModule,
    ApiProvidersModule,
    WebhookModule,
    WalletModule,
    BillModule,
    AdminModule,
    TestFolderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ApiKeyMiddleware)
      .exclude(
        {
          path: 'v1/webhook/flutterwave',
          method: RequestMethod.POST,
        },
        { path: 'v1/webhook/VFD/payment', method: RequestMethod.POST },
        { path: 'v1/webhook/safehaven', method: RequestMethod.POST },
        { path: 'v1/test-folder/create-account', method: RequestMethod.POST },
        { path: 'v1/test-folder/credit-account', method: RequestMethod.POST },
        { path: 'v1/test-folder/get-banks', method: RequestMethod.GET },
      )
      .forRoutes('*');

    consumer
      .apply(JwtMiddleware)
      .exclude(
        { path: 'v1/auth/register', method: RequestMethod.POST },
        { path: 'v1/auth/login', method: RequestMethod.POST },
        { path: 'v1/auth/verify-email', method: RequestMethod.POST },
        { path: 'v1/auth/resend-verify-email', method: RequestMethod.POST },
        { path: 'v1/auth/passcode-login', method: RequestMethod.POST },
        { path: 'v1/auth/resend-2fa-email', method: RequestMethod.POST },
        { path: 'v1/auth/verify-2fa-code', method: RequestMethod.POST },
        { path: 'v1/auth/forgot-password', method: RequestMethod.POST },
        { path: 'v1/auth/verify-forgot-password', method: RequestMethod.POST },
        { path: 'v1/auth/reset-password', method: RequestMethod.POST },
        { path: 'v1/user/validate-phoneNumber', method: RequestMethod.POST },
        { path: 'v1/user/verify-phoneNumber', method: RequestMethod.POST },
        { path: 'v1/user/:id', method: RequestMethod.DELETE },
        { path: 'v1/webhook/flutterwave', method: RequestMethod.POST },
        { path: 'v1/webhook/VFD/payment', method: RequestMethod.POST },
        { path: 'v1/webhook/safehaven', method: RequestMethod.POST },
        { path: 'v1/test-folder/create-account', method: RequestMethod.POST },
        { path: 'v1/test-folder/credit-account', method: RequestMethod.POST },
        { path: 'v1/test-folder/get-banks', method: RequestMethod.GET },
        { path: 'v1/contact-us', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
