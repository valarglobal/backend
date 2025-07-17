import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePushTokenDto, RemovePushTokenDto } from './dto/PushTokenDto';
import { User } from '@prisma/client';


@Injectable()
export class PushTokenService {
  constructor(private prisma: PrismaService) {}

  async savePushToken(   user: User, createPushTokenDto: CreatePushTokenDto) {
    const { token, deviceId, platform } = createPushTokenDto;

    // Check if token already exists for this user
    const existingToken = await this.prisma.pushToken.findFirst({
      where: {
        userId:user.id,
        token,
      },
    });

    if (existingToken) {
      // Update existing token
      return this.prisma.pushToken.update({
        where: { id: existingToken.id },
        data: {
          deviceId,
          platform,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }

    // Create new token
    return this.prisma.pushToken.create({
      data: {
      userId:user.id,
        token,
        deviceId,
        platform,
      },
    });
  }

  async removePushToken(   user: User, removePushTokenDto: RemovePushTokenDto) {
    const { token } = removePushTokenDto;

    return this.prisma.pushToken.updateMany({
      where: {
        userId:user.id,
        token,
      },
      data: {
        isActive: false,
      },
    });
  }

  async getUserPushTokens(userId: string) {
    return this.prisma.pushToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        token: true,
        platform: true,
      },
    });
  }

  async getActivePushTokens(userIds: string[]) {
    return this.prisma.pushToken.findMany({
      where: {
        userId: {
          in: userIds,
        },
        isActive: true,
      },
      select: {
        token: true,
        userId: true,
        platform: true,
      },
    });
  }
}