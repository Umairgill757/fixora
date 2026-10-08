/**
 * Notification channels. Each channel has a console fallback (dev) and a
 * real provider that activates when its env credentials are present:
 *   Email: Resend  (RESEND_API_KEY, RESEND_FROM)
 *   SMS:   Twilio  (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)
 *   Push:  Expo    (EXPO_PUSH_ENABLED=true; no key needed for basic push)
 */
export interface EmailChannel {
  readonly name: string;
  sendEmail(to: string, subject: string, html: string): Promise<void>;
}

export interface SmsChannel {
  readonly name: string;
  sendSms(to: string, message: string): Promise<void>;
}

export interface PushChannel {
  readonly name: string;
  sendPush(token: string, title: string, body: string): Promise<void>;
}
