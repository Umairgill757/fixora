import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Customer starts a JazzCash checkout for their QUOTED booking. */
  @Post('bookings/:id/pay')
  @UseGuards(AuthGuard('jwt'))
  initiate(@Param('id') id: string, @Req() req: { user: { id: string; role: string } }) {
    return this.payments.initiateBookingPayment(id, req.user);
  }

  /**
   * JazzCash server-to-server callback (pp_ReturnURL). Public by design —
   * authenticity comes from the HMAC signature, not from a login session.
   */
  @Post('callback/jazzcash')
  async jazzcashCallback(@Body() body: Record<string, string>) {
    const result = await this.payments.handleJazzCashCallback(body ?? {});
    // Plain acknowledgement; JazzCash only needs HTTP 200.
    return result;
  }
}
