import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { TechniciansModule } from './technicians/technicians.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { DisputesModule } from './disputes/disputes.module.js';
import { PayoutsModule } from './payouts/payouts.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AgentsModule } from './agents/agents.module.js';

@Module({
  imports: [PrismaModule, AuthModule, BusinessesModule, BookingsModule, PaymentsModule, TechniciansModule, InvoicesModule, ReviewsModule, DisputesModule, PayoutsModule, AdminModule, NotificationsModule, AgentsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
