import { Module } from '@nestjs/common';
import { TestFolderController } from './test-folder.controller';
import { ApiProvidersModule } from 'src/api-providers/api-providers.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [ApiProvidersModule, PrismaModule],
  controllers: [TestFolderController],
})
export class TestFolderModule {}
