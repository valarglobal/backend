import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ContactUsDto } from './dto/ContactUsDto';
import { EmailService } from './email/email.service';

@Injectable()
export class AppService {
  constructor(private readonly emailService: EmailService) {}
  getHello(): string {
    return 'Hello World!';
  }

  async contactUs(body: ContactUsDto) {
    // send acknowledgement email to user
    try {
      this.emailService.sendEmail({
        to: body.email,
        subject: 'Thank you for contacting us',
        template: 'contact/user-acknowledgement.hbs',
        context: {
          firstName: body.fullname.split(' ')[0],
          message: body.message,
          title: body.title,
          supportUrl: `#`,
        },
      });
    } catch (error) {
      console.log('Error sending acknowledgement email', error);
      throw new InternalServerErrorException(
        'Error sending acknowledgement email',
      );
    }

    // send notification email to support

    try {
      this.emailService.sendEmail({
        to: 'support@nattypay.com',
        subject: 'New message from user',
        template: 'contact/support-notification.hbs',
        context: {
          name: body.fullname,
          email: body.email,
          message: body.message,
          title: body.title,
        },
      });
    } catch (error) {
      console.log('Error sending notification email', error);
      throw new InternalServerErrorException(
        'Error sending notification email',
      );
    }

    return {
      message: 'Message sent successfully',
      status: HttpStatus.OK,
    };
  }
}
