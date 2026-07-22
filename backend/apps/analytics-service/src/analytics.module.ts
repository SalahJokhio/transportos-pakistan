import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ExecutiveCopilotController } from './executive-copilot.controller';
import { ExecutiveCopilotService } from './executive-copilot.service';
import { Booking } from '../../booking-service/src/entities/booking.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Booking]),
  ],
  controllers: [AnalyticsController, ExecutiveCopilotController],
  providers: [AnalyticsService, ExecutiveCopilotService],
})
export class AnalyticsModule {}
