import { forwardRef, Module } from '@nestjs/common';
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

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [
    SafeHavenService,
    ApiProviderService,
    DojahService,
    FlutterwaveService,
    ReloadlyService,
    VFDBankService,
    GraphService,
    TermiiService,
  ],
  exports: [
    SafeHavenService,
    ApiProviderService,
    DojahService,
    FlutterwaveService,
    ReloadlyService,
    VFDBankService,
    GraphService,
    TermiiService,
  ],
})
export class ApiProvidersModule {}
