import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';

type ReqUser = { user: { id: string; role: string } };

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('bookings/:id/reviews')
  @UseGuards(AuthGuard('jwt'))
  create(@Param('id') id: string, @Body() dto: CreateReviewDto, @Req() req: ReqUser) {
    return this.reviews.create(id, dto, req.user);
  }

  @Get('businesses/:id/reviews')
  forBusiness(@Param('id') id: string) {
    return this.reviews.forBusiness(id);
  }
}
