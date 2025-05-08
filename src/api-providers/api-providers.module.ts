import { Module } from '@nestjs/common';
import { SafeHavenService } from './providers/safe-haven.service';
import { ApiProviderService } from './api-providers.service';
import { DojahService } from './providers/dojah.service';
import { FlutterwaveService } from './providers/flutterwave.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ReloadlyService } from './providers/reloadly.service';
import { VFDBankService } from './providers/VFDBank.service';
import { EmailModule } from 'src/email/email.module';
import { GraphService } from './providers/graph.service';
import { TermiiService } from './providers/termii.service';
import { AwsService } from './providers/aws.service';
import { HelperService } from './providers/helper.service';
import { SendarSmsService } from './providers/sendar.service';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [
    ApiProviderService,
    SafeHavenService,
    DojahService,
    FlutterwaveService,
    ReloadlyService,
    VFDBankService,
    GraphService,
    TermiiService,
    AwsService,
    HelperService,
    SendarSmsService
  ],
  exports: [
    ApiProviderService,
    SafeHavenService,
    DojahService,
    FlutterwaveService,
    ReloadlyService,
    VFDBankService,
    GraphService,
    TermiiService,
    AwsService,
    HelperService,
    SendarSmsService
  ],
})
export class ApiProvidersModule { }
