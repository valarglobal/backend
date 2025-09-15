import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { resolve } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false, 
  });

  const logger = new Logger('Bootstrap');

  // Static assets & template engine
  app.useStaticAssets(resolve('./src/public'));
  app.setBaseViewsDir(resolve('./src/templates'));
  app.setViewEngine('hbs');

  // Global prefix for all routes
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // Global validation pipe with better config
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Auto-transform payloads to DTO classes
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Security middlewares
  app.use(helmet()); // Adds security headers
  app.use(cookieParser()); // Enable cookie parsing for auth/session

  // Configure CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://natty-pay.vercel.app',
      'https://www.nattypay.com',
      'https://nattypay.com',
      'https://www.valarpay.com',
      'https://valar-pay.vercel.app',
      'https://valarpay.com',
    ],
    credentials: true, // Allow cookies or authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Start server
  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is up and running on: http://localhost:${port}/api`);
}
bootstrap();
