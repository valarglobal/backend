import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'];
    const configApiKey = this.configService.get<string>('API_KEY');

    // Check if API key is required but not provided
    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    // Check if API key is valid
    if (apiKey !== configApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // If everything is valid, proceed to the next middleware/handler
    next();
  }
}
