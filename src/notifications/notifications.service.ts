import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PushTokenService } from './push-token.service';

@Injectable()
export class PushNotificationService {
  private expo: Expo;
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private pushTokenService: PushTokenService) {
    this.expo = new Expo();
  }

  async sendNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: any,
  ) {
    try {
      const userTokens = await this.pushTokenService.getUserPushTokens(userId);
      
      if (userTokens.length === 0) {
        this.logger.warn(`No push tokens found for user ${userId}`);
        return;
      }

      const messages: ExpoPushMessage[] = userTokens
        .filter(tokenData => Expo.isExpoPushToken(tokenData.token))
        .map(tokenData => ({
          to: tokenData.token,
          sound: 'default',
          title,
          body,
          data,
        }));

      if (messages.length === 0) {
        this.logger.warn(`No valid Expo push tokens for user ${userId}`);
        return;
      }

      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          this.logger.error('Error sending push notification chunk:', error);
        }
      }

      return tickets;
    } catch (error) {
      this.logger.error('Error sending notification to user:', error);
      throw error;
    }
  }

  async sendTransferCompletedNotification(
    userId: string,
    transferAmount: number,
    recipientName: string,
    transferId: string,
  ) {
    const title = 'Transfer Completed';
    const body = `Your transfer of ₦${transferAmount.toLocaleString()} to ${recipientName} has been completed successfully.`;
    const data = {
      type: 'transfer_completed',
      transferId,
      amount: transferAmount,
      recipientName,
    };

    return this.sendNotificationToUser(userId, title, body, data);
  }

  async sendIncomingTransferNotification(
    userId: string,
    amount: number,
    senderName: string,
    transferId: string,
  ) {
    const title = 'Money Received';
    const body = `You received ₦${amount.toLocaleString()} from ${senderName}.`;
    const data = {
      type: 'incoming_transfer',
      transferId,
      amount,
      senderName,
    };

    return this.sendNotificationToUser(userId, title, body, data);
  }
}