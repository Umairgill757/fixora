import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AgentsService } from './agents.service.js';
import { AiQuoteDto } from './dto/ai-quote.dto.js';

type ReqUser = { user: { id: string; role: string } };

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  /** AI quote: price range + suggested slots for a problem description. */
  @Post('quote')
  quote(@Body() dto: AiQuoteDto, @Req() req: ReqUser) {
    return this.agents.quote(dto, req.user);
  }

  /** AI dispatch: auto-assign the best verified technician. */
  @Post('bookings/:id/auto-dispatch')
  autoDispatch(@Param('id') id: string, @Req() req: ReqUser) {
    return this.agents.autoDispatch(id, req.user);
  }
}
