import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      // Connect to the database
      await this.$connect();
      console.log('Successfully connected to the database');

      // Check if the "uuid-ossp" extension exists
      const extensionExists = await this.$queryRawUnsafe<
        Array<{ extname: string }>
      >(`SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp'`);

      if (extensionExists.length === 0) {
        // If not installed, install the extension
        await this.$executeRawUnsafe(`CREATE EXTENSION "uuid-ossp";`);
        console.log('uuid-ossp extension is enabled');
      } else {
        console.log('uuid-ossp extension already exists');
      }
    } catch (err) {
      console.error('Error during database initialization:', err);
    }
  }
}
