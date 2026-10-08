import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { JazzCashProvider } from './jazzcash.provider.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly jazzcash = new JazzCashProvider();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start a JazzCash checkout for a QUOTED booking.
   * Returns the gateway URL + signed fields; the web app auto-submits
   * them as a form POST so the customer pays on JazzCash's page.
   */
  async initiateBookingPayment(bookingId: string, user: { id: string; role: string }) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { business: { select: { ownerId: true, name: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (user.role !== 'ADMIN' && booking.customerId !== user.id) {
      throw new ForbiddenException('You can only pay for your own bookings.');
    }
    if (booking.status !== BookingStatus.QUOTED) {
      throw new BadRequestException(`Booking is ${booking.status}; only QUOTED bookings can be paid.`);
    }
    const amount = booking.totalPrice ?? 0;
    if (amount <= 0) throw new BadRequestException('Booking has no payable amount.');
    if (!this.jazzcash.configured) {
      throw new BadRequestException(
        'JazzCash is not configured. Set JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD and JAZZCASH_INTEGRITY_SALT.',
      );
    }

    const txnRefNo = `FX-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
    const amountPaisa = Math.round(amount * 100);

    await this.prisma.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        provider: this.jazzcash.name,
        providerTxnRef: txnRefNo,
        amount,
        currency: 'pkr',
        status: 'pending',
      },
      update: { providerTxnRef: txnRefNo, amount, status: 'pending', gatewayTxnId: null },
    });

    const fields = this.jazzcash.buildCheckoutFields({
      txnRefNo,
      amountPaisa,
      billReference: booking.id,
      description: `Fixora booking at ${booking.business.name}`,
      returnUrl: this.jazzcash.returnUrl(),
    });

    return { gatewayUrl: this.jazzcash.gatewayUrl(), fields, txnRefNo, amount };
  }

  /**
   * Handle JazzCash's server-to-server POST to pp_ReturnURL.
   * Verifies the HMAC, matches amount, and is idempotent on txnRefNo.
   */
  async handleJazzCashCallback(payload: Record<string, string>) {
    if (!this.jazzcash.verifyCallback(payload)) {
      this.logger.warn('JazzCash callback rejected: bad signature');
      return { ok: false, reason: 'bad_signature' };
    }

    const txnRefNo = this.jazzcash.callbackTxnRef(payload);
    if (!txnRefNo) return { ok: false, reason: 'missing_txn_ref' };

    const payment = await this.prisma.payment.findFirst({
      where: { providerTxnRef: txnRefNo },
      include: { booking: true },
    });
    if (!payment) {
      this.logger.warn(`JazzCash callback for unknown txnRef ${txnRefNo}`);
      return { ok: false, reason: 'unknown_payment' };
    }

    // Idempotent: already-settled callbacks just ack.
    if (payment.status === 'succeeded') return { ok: true, duplicate: true };

    // Amount guard: what JazzCash reports must match what we asked for.
    const reportedPaisa = this.jazzcash.callbackAmountPaisa(payload);
    if (reportedPaisa !== Math.round(payment.amount * 100)) {
      this.logger.warn(`JazzCash amount mismatch on ${txnRefNo}`);
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });
      return { ok: false, reason: 'amount_mismatch' };
    }

    if (this.jazzcash.isSuccess(payload)) {
      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'succeeded', gatewayTxnId: this.jazzcash.gatewayTxnId(payload) },
        }),
        this.prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: BookingStatus.PAID },
        }),
      ]);
      this.logger.log(`Booking ${payment.bookingId} marked PAID via JazzCash ${txnRefNo}`);
      return { ok: true };
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed', gatewayTxnId: this.jazzcash.gatewayTxnId(payload) },
    });
    return { ok: true, paid: false };
  }
}
