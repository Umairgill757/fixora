import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DisputesService } from './disputes.service.js';
import { CreateDisputeDto, ResolveDisputeDto } from './dto/dispute.dto.js';

type ReqUser = { user: { id: string; role: string } };

@Controller()
@UseGuards(AuthGuard('jwt'))
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post('bookings/:id/disputes')
  create(@Param('id') id: string, @Body() dto: CreateDisputeDto, @Req() req: ReqUser) {
    return this.disputes.create(id, dto, req.user);
  }

  @Get('disputes')
  list(@Query('status') status: string | undefined, @Req() req: ReqUser) {
    return this.disputes.list(req.user, status);
  }

  @Patch('disputes/:id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto, @Req() req: ReqUser) {
    return this.disputes.resolve(id, dto, req.user);
  }
}
