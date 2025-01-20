import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { resolve } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(resolve('./src/public'));
  app.setBaseViewsDir(resolve('./src/templates'));
  app.setViewEngine('hbs');

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe());

  // Configure CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://natty-pay.vercel.app',
    ],
    credentials: true, // Allow cookies or authorization headers
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
