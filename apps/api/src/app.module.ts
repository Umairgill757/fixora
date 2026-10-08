import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BusinessesModule } from './businesses/businesses.module.js';

@Module({
  imports: [PrismaModule, AuthModule, BusinessesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
