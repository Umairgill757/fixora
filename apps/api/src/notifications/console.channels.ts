import { Logger } from '@nestjs/common';
import { EmailChannel, PushChannel, SmsChannel } from './channels.interface.js';

/** Dev fallback: logs instead of sending. Never fails. */
export class ConsoleEmailChannel implements EmailChannel {
  readonly name = 'console-email';
  private readonly logger = new Logger(ConsoleEmailChannel.name);
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    this.logger.log(`[email -> ${to}] ${subject}\n${html.slice(0, 300)}`);
  }
}

export class ConsoleSmsChannel implements SmsChannel {
  readonly name = 'console-sms';
  private readonly logger = new Logger(ConsoleSmsChannel.name);
  async sendSms(to: string, message: string): Promise<void> {
    this.logger.log(`[sms -> ${to}] ${message}`);
  }
}

export class ConsolePushChannel implements PushChannel {
  readonly name = 'console-push';
  private readonly logger = new Logger(ConsolePushChannel.name);
  async sendPush(token: string, title: string, body: string): Promise<void> {
    this.logger.log(`[push -> ${token.slice(0, 12)}…] ${title}: ${body}`);
  }
}
