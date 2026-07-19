import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@app/database';

// Import all service modules
import { UserModule } from '../../user-service/src/user.module';
import { FleetModule } from '../../fleet-service/src/fleet.module';
import { BookingModule } from '../../booking-service/src/booking.module';
import { TrackingModule } from '../../tracking-service/src/tracking.module';
import { PaymentModule } from '../../payment-service/src/payment.module';
import { NotificationModule } from '../../notification-service/src/notification.module';
import { AiModule } from '../../ai-service/src/ai.module';
import { AnalyticsModule } from '../../analytics-service/src/analytics.module';
import { HealthController } from './health.controller';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    UserModule,
    FleetModule,
    BookingModule,
    TrackingModule,
    PaymentModule,
    NotificationModule,
    AiModule,
    AnalyticsModule,
  ],
  controllers: [HealthController, UploadController],
})
export class ApiGatewayModule {}
