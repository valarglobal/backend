import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from 'src/guards/role.guard';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ApiProvidersModule } from 'src/api-providers/api-providers.module';

@Module({
  imports: [PrismaModule, ApiProvidersModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AdminModule {}
