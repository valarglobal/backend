import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No token provided');
      }

      const token = authHeader.split(' ')[1];
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const version = payload?.version;
      const user = await this.prisma.user.findUnique({
        where: {
          id: payload?.sub,
        },
        include: {
          wallet: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      if (user?.tokenVersion !== version) {
        throw new UnauthorizedException('Invalid token');
      }

      // Attach the user object to the request object
      req['user'] = user;
      next();
    } catch (error) {
      console.log('error decoding jwt token', error);
      throw new UnauthorizedException(error?.message);
    }
  }
}
