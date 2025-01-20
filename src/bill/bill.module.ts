import { Module } from '@nestjs/common';
import { BillController } from './bill.controller';
import { BillService } from './bill.service';
import { ApiProvidersModule } from 'src/api-providers/api-providers.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [ApiProvidersModule, PrismaModule],
  controllers: [BillController],
  providers: [BillService],
})
export class BillModule {}
