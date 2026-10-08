import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service.js';

type ReqUser = { user: { id: string; role: string } };

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview(@Req() req: ReqUser) {
    return this.admin.overview(req.user);
  }

  @Get('users')
  users(@Req() req: ReqUser) {
    return this.admin.users(req.user);
  }

  @Get('bookings')
  bookings(@Req() req: ReqUser) {
    return this.admin.bookings(req.user);
  }
}
