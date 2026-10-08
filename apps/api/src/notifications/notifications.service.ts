import { Injectable, Logger } from '@nestjs/common';
import { EmailChannel, PushChannel, SmsChannel } from './channels.interface.js';
import { ConsoleEmailChannel, ConsolePushChannel, ConsoleSmsChannel } from './console.channels.js';
import { ExpoPushChannel, ResendEmailChannel, TwilioSmsChannel } from './real.channels.js';

export interface NotifyTarget {
  email?: string | null;
  phone?: string | null;
  pushToken?: string | null;
  name?: string | null;
}

/**
 * Central notification hub. Picks real providers when their env credentials
 * exist, otherwise logs via console channels. Every send is fire-and-forget
 * safe: failures are logged and never break the booking flow.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly email: EmailChannel;
  private readonly sms: SmsChannel;
  private readonly push: PushChannel;

  constructor() {
    this.email = ResendEmailChannel.configured ? new ResendEmailChannel() : new ConsoleEmailChannel();
    this.sms = TwilioSmsChannel.configured ? new TwilioSmsChannel() : new ConsoleSmsChannel();
    this.push = ExpoPushChannel.configured ? new ExpoPushChannel() : new ConsolePushChannel();
    this.logger.log(
      `channels: email=${this.email.name} sms=${this.sms.name} push=${this.push.name}`,
    );
  }

  private async safe(fn: () => Promise<void>, label: string) {
    try {
      await fn();
    } catch (e) {
      this.logger.warn(`notification failed (${label}): ${(e as Error).message}`);
    }
  }

  private async mail(to: NotifyTarget, subject: string, html: string) {
    if (!to.email) return;
    await this.safe(() => this.email.sendEmail(to.email!, subject, html), 'email');
  }

  private async text(to: NotifyTarget, message: string) {
    if (!to.phone) return;
    await this.safe(() => this.sms.sendSms(to.phone!, message), 'sms');
  }

  // ---- Domain events ----

  async bookingRequested(customer: NotifyTarget, businessName: string, when: string) {
    await this.mail(
      customer,
      'Booking request received — Fixora',
      `<p>Hi ${customer.name ?? 'there'},</p><p>Your booking request with <b>${businessName}</b> for <b>${when}</b> was received. The business will confirm your slot shortly.</p>`,
    );
  }

  async bookingConfirmedOwner(owner: NotifyTarget, customerName: string, when: string) {
    await this.mail(
      owner,
      'New booking request — Fixora',
      `<p>You have a new booking request from <b>${customerName}</b> for <b>${when}</b>. Open your dashboard to confirm and dispatch.</p>`,
    );
    await this.text(owner, `Fixora: new booking request from ${customerName} for ${when}.`);
  }

  async paymentSucceeded(customer: NotifyTarget, amount: number, businessName: string) {
    await this.mail(
      customer,
      'Payment received — Fixora',
      `<p>Hi ${customer.name ?? 'there'},</p><p>We received your payment of <b>Rs ${amount.toLocaleString()}</b> for <b>${businessName}</b>. Your slot is confirmed.</p>`,
    );
  }

  async technicianAssigned(
    tech: NotifyTarget,
    customer: NotifyTarget,
    when: string,
    address: string,
  ) {
    await this.text(tech, `Fixora: new job assigned for ${when} at ${address}. Open the app to accept.`);
    await this.mail(
      customer,
      'Technician assigned — Fixora',
      `<p>Good news — a verified technician has been assigned to your job scheduled for <b>${when}</b>.</p>`,
    );
  }

  async jobCompleted(customer: NotifyTarget, businessName: string) {
    await this.mail(
      customer,
      'Job completed — Fixora',
      `<p>Your job with <b>${businessName}</b> is marked complete. Please leave a review from My bookings.</p>`,
    );
  }

  async invoiceIssued(customer: NotifyTarget, amount: number, dueAt: string, invoiceId: string) {
    await this.mail(
      customer,
      `Invoice ${invoiceId.slice(0, 8)} — Rs ${amount.toLocaleString()}`,
      `<p>Hi ${customer.name ?? 'there'},</p><p>Your invoice for <b>Rs ${amount.toLocaleString()}</b> is ready. Due by <b>${dueAt}</b>.</p><p>Invoice ID: ${invoiceId}</p>`,
    );
  }

  async disputeOpened(owner: NotifyTarget, bookingId: string, reason: string) {
    await this.mail(
      owner,
      'Dispute opened — Fixora',
      `<p>A customer opened a dispute on booking ${bookingId.slice(0, 8)}:</p><p>“${reason}”</p><p>Please respond from your dashboard.</p>`,
    );
  }

  async disputeResolved(customer: NotifyTarget, outcome: 'resolved' | 'refunded') {
    const msg =
      outcome === 'refunded'
        ? 'your dispute was resolved with a refund. The amount will be returned to your payment method.'
        : 'your dispute was reviewed and resolved.';
    await this.mail(customer, 'Dispute update — Fixora', `<p>Hi ${customer.name ?? 'there'},</p><p>${msg}</p>`);
  }

  async payoutCreated(tech: NotifyTarget, amount: number) {
    await this.mail(
      tech,
      'Payout initiated — Fixora',
      `<p>Hi ${tech.name ?? 'there'},</p><p>A payout of <b>Rs ${amount.toLocaleString()}</b> has been initiated to your account.</p>`,
    );
    await this.text(tech, `Fixora: payout of Rs ${amount.toLocaleString()} initiated.`);
  }
}
