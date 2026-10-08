import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto.js';
import { AssignTechnicianDto } from './dto/assign-technician.dto.js';

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  create(@Body() dto: CreateBookingDto, @Req() req: { user: { id: string; role: string } }) {
    return this.bookings.create(dto, req.user);
  }

  @Get()
  list(@Req() req: { user: { id: string; role: string } }) {
    return this.bookings.list(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { user: { id: string; role: string } }) {
    return this.bookings.findOne(id, req.user);
  }

  @Post(':id/assign')
  assignTechnician(
    @Param('id') id: string,
    @Body() dto: AssignTechnicianDto,
    @Req() req: { user: { id: string; role: string } },
  ) {
    return this.bookings.assignTechnician(id, dto.technicianId, req.user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Req() req: { user: { id: string; role: string } },
  ) {
    return this.bookings.updateStatus(id, dto.status, req.user);
  }
}
