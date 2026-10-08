import { Module } from '@nestjs/common';
import { TechniciansController } from './technicians.controller.js';
import { TechniciansService } from './technicians.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [TechniciansController],
  providers: [TechniciansService],
  exports: [TechniciansService],
})
export class TechniciansModule {}
