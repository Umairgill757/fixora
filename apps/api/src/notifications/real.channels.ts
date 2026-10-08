import { Logger } from '@nestjs/common';
import { EmailChannel, PushChannel, SmsChannel } from './channels.interface.js';

/** Real email via Resend. Activates when RESEND_API_KEY is set. */
export class ResendEmailChannel implements EmailChannel {
  readonly name = 'resend';
  private readonly logger = new Logger(ResendEmailChannel.name);

  static get configured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'Fixora <noreply@fixora.pk>',
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`Resend failed: ${res.status} ${text.slice(0, 200)}`);
      throw new Error('Email send failed');
    }
  }
}

/** Real SMS via Twilio. Activates when TWILIO_* vars are set. */
export class TwilioSmsChannel implements SmsChannel {
  readonly name = 'twilio';
  private readonly logger = new Logger(TwilioSmsChannel.name);

  static get configured(): boolean {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM,
    );
  }

  async sendSms(to: string, message: string): Promise<void> {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: process.env.TWILIO_FROM!, To: to, Body: message }),
    });
    if (!res.ok) {
      this.logger.warn(`Twilio failed: ${res.status}`);
      throw new Error('SMS send failed');
    }
  }
}

/** Real push via Expo Push API (for the future mobile apps). */
export class ExpoPushChannel implements PushChannel {
  readonly name = 'expo-push';
  private readonly logger = new Logger(ExpoPushChannel.name);

  static get configured(): boolean {
    return process.env.EXPO_PUSH_ENABLED === 'true';
  }

  async sendPush(token: string, title: string, body: string): Promise<void> {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default' }),
    });
    if (!res.ok) {
      this.logger.warn(`Expo push failed: ${res.status}`);
      throw new Error('Push send failed');
    }
  }
}
