import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BusinessesService } from './businesses.service.js';
import { CreateBusinessDto } from './dto/create-business.dto.js';
import { UpdateBusinessDto } from './dto/update-business.dto.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  // Public: browse + SEO
  @Get()
  list(@Query('city') city?: string, @Query('category') category?: string) {
    return this.businesses.list({ city, category });
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.businesses.findBySlug(slug);
  }

  @Get(':id/services')
  listServices(@Param('id') id: string) {
    return this.businesses.listServices(id);
  }

  // Owner / admin only
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('BUSINESS_OWNER', 'ADMIN')
  create(@Body() dto: CreateBusinessDto, @Req() req: { user: { id: string; role: string } }) {
    return this.businesses.create(dto, req.user);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('BUSINESS_OWNER', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
    @Req() req: { user: { id: string; role: string } },
  ) {
    return this.businesses.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('BUSINESS_OWNER', 'ADMIN')
  remove(@Param('id') id: string, @Req() req: { user: { id: string; role: string } }) {
    return this.businesses.remove(id, req.user);
  }

  @Post(':id/services')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('BUSINESS_OWNER', 'ADMIN')
  addService(
    @Param('id') id: string,
    @Body() dto: CreateServiceDto,
    @Req() req: { user: { id: string; role: string } },
  ) {
    return this.businesses.addService(id, dto, req.user);
  }

  @Delete(':id/services/:serviceId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('BUSINESS_OWNER', 'ADMIN')
  removeService(
    @Param('id') id: string,
    @Param('serviceId') serviceId: string,
    @Req() req: { user: { id: string; role: string } },
  ) {
    return this.businesses.removeService(id, serviceId, req.user);
  }
}
