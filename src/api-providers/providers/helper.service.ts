import { Injectable } from '@nestjs/common';
import { DojahService } from './dojah.service';
import { TermiiService } from './termii.service';
import { AwsService } from './aws.service';
import { SendarSmsService } from './sendar.service';

@Injectable()
export class HelperService {
  constructor(
    private readonly dojahService: DojahService,
    private readonly termiiService: TermiiService,
    private readonly awsService: AwsService,
    private readonly sendarService: SendarSmsService,
  ) { }

  async sendSms(
    phoneNumber: string,
    message: string,
    type: 'dojah' | 'termii' | 'aws' | 'sendar',
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
    } else if (type === 'sendar') {
      return this.sendarService.sendSMS({
        contact: [{
          number: this.addCountryCode(phoneNumber),
          body: message,
          sms_type: 'plain',
        }],
      });
    }
  }

  addCountryCode(phoneNumber: string) {
    console.log('phoneNumber', phoneNumber);

    // Check if the phone number already starts with '+234'
    if (phoneNumber?.startsWith('234')) {
      return "+" + phoneNumber;
    }
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
