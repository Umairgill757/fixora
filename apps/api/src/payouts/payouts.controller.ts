import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PayoutsService } from './payouts.service.js';
import { CreatePayoutDto } from './dto/create-payout.dto.js';

type ReqUser = { user: { id: string; role: string } };

@Controller('payouts')
@UseGuards(AuthGuard('jwt'))
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Post()
  create(@Body() dto: CreatePayoutDto, @Req() req: ReqUser) {
    return this.payouts.create(dto, req.user);
  }

  @Get()
  list(@Req() req: ReqUser) {
    return this.payouts.list(req.user);
  }

  @Get('earnings')
  myEarnings(@Req() req: ReqUser) {
    return this.payouts.myEarnings(req.user);
  }

  @Patch(':id/paid')
  markPaid(@Param('id') id: string, @Req() req: ReqUser) {
    return this.payouts.markPaid(id, req.user);
  }
}
