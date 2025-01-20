import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';
import { ContactUsDto } from './dto/ContactUsDto';

@Controller('v1')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('contact-us')
  @HttpCode(HttpStatus.OK)
  async contactUs(@Body() body: ContactUsDto) {
    return this.appService.contactUs(body);
  }
}
