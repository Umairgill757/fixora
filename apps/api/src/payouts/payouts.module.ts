import { Module } from '@nestjs/common';
import { PayoutsController } from './payouts.controller.js';
import { PayoutsService } from './payouts.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
