import { Module } from '@nestjs/common';
import { DisputesController } from './disputes.controller.js';
import { DisputesService } from './disputes.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
