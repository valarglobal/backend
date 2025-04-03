import { Injectable } from '@nestjs/common';
import { DojahService } from './dojah.service';
import { TermiiService } from './termii.service';
import { AwsService } from './aws.service';

@Injectable()
export class HelperService {
  constructor(
    private readonly dojahService: DojahService,
    private readonly termiiService: TermiiService,
    private readonly awsService: AwsService,
  ) {}

  async sendSms(
    phoneNumber: string,
    message: string,
    type: 'dojah' | 'termii' | 'aws',
    channel: 'sms' | 'whatsapp' = 'sms',
  ) {
    if (type === 'dojah') {
      return this.dojahService.sendSms({
        phoneNumber: this.addCountryCode(phoneNumber),
        message,
        channel,
      });
    } else if (type === 'termii') {
      return this.termiiService.sendSms({
        phoneNumber: this.addCountryCode(phoneNumber),
        message,
      });
    } else if (type === 'aws') {
      return this.awsService.sendSms({
        phoneNumber: this.addCountryCode(phoneNumber),
        message,
      });
    }
  }

  addCountryCode(phoneNumber: string) {
    // Check if the phone number already starts with '+234'
    if (phoneNumber?.startsWith('+234')) {
      return phoneNumber;
    }
    // Remove leading zeros and add '+234'
    if (phoneNumber?.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1);
    }
    return '+234' + phoneNumber;
  }
}
