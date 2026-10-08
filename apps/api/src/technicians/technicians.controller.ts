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
import { VerificationStatus } from '@prisma/client';
import { TechniciansService } from './technicians.service.js';
import { ApplyTechnicianDto } from './dto/apply-technician.dto.js';
import { UpdateTechnicianDto } from './dto/update-technician.dto.js';
import { VerifyTechnicianDto } from './dto/verify-technician.dto.js';

type ReqUser = { user: { id: string; role: string } };

@Controller('technicians')
@UseGuards(AuthGuard('jwt'))
export class TechniciansController {
  constructor(private readonly technicians: TechniciansService) {}

  @Post('apply')
  apply(@Body() dto: ApplyTechnicianDto, @Req() req: ReqUser) {
    return this.technicians.apply(dto, req.user);
  }

  @Get('me')
  myProfile(@Req() req: ReqUser) {
    return this.technicians.myProfile(req.user);
  }

  @Patch('me')
  updateMyProfile(@Body() dto: UpdateTechnicianDto, @Req() req: ReqUser) {
    return this.technicians.updateMyProfile(dto, req.user);
  }

  @Get('jobs')
  myJobs(@Req() req: ReqUser) {
    return this.technicians.myJobs(req.user);
  }

  @Post('jobs/:id/accept')
  acceptJob(@Param('id') id: string, @Req() req: ReqUser) {
    return this.technicians.acceptJob(id, req.user);
  }

  @Post('jobs/:id/decline')
  declineJob(@Param('id') id: string, @Req() req: ReqUser) {
    return this.technicians.declineJob(id, req.user);
  }

  @Post('jobs/:id/complete')
  completeJob(@Param('id') id: string, @Req() req: ReqUser) {
    return this.technicians.completeJob(id, req.user);
  }

  // Admin
  @Get()
  list(@Query('status') status: VerificationStatus | undefined, @Req() req: ReqUser) {
    return this.technicians.list(status, req.user);
  }

  @Patch(':id/verify')
  verify(@Param('id') id: string, @Body() dto: VerifyTechnicianDto, @Req() req: ReqUser) {
    return this.technicians.verify(id, dto.status, req.user);
  }
}
