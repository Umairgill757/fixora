import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvoicesService } from './invoices.service.js';

type ReqUser = { user: { id: string; role: string } };

@Controller()
@UseGuards(AuthGuard('jwt'))
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post('bookings/:id/invoice')
  generate(@Param('id') id: string, @Req() req: ReqUser) {
    return this.invoices.generate(id, req.user);
  }

  @Get('invoices/:id')
  findOne(@Param('id') id: string, @Req() req: ReqUser) {
    return this.invoices.findOne(id, req.user);
  }
}
