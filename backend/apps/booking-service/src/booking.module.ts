import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { Booking } from './entities/booking.entity';
import { BookingSeat } from './entities/booking-seat.entity';
import { Coupon } from './entities/coupon.entity';
import { Shift } from './entities/shift.entity';
import { ShiftService } from './services/shift.service';
import { FunnelEvent } from './entities/funnel-event.entity';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyService } from './services/api-key.service';
import { PartnerController, ApiKeyController } from './partner.controller';
import { BookingService } from './services/booking.service';
import { PricingService } from './services/pricing.service';
import { SeatLockService } from './services/seat-lock.service';
import { TicketService } from './services/ticket.service';
import { CouponService } from './services/coupon.service';
import { BookingController } from './booking.controller';
import { CouponController } from './coupon.controller';
import { EventsController } from './events.controller';

// Shared DB entities for loyalty auto-earn, seat release and ticket details
import { User } from '../../user-service/src/entities/user.entity';
import { LoyaltyTransaction } from '../../user-service/src/entities/loyalty-transaction.entity';
import { Trip } from '../../fleet-service/src/entities/trip.entity';
import { Route } from '../../fleet-service/src/entities/route.entity';
import { Bus } from '../../fleet-service/src/entities/bus.entity';
import { NotificationModule } from '../../notification-service/src/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Booking, BookingSeat, Coupon, Shift, FunnelEvent, ApiKey, User, LoyaltyTransaction, Trip, Route, Bus]),
    NotificationModule, // SMS on confirm / cancel
  ],
  controllers: [BookingController, CouponController, EventsController, PartnerController, ApiKeyController],
  providers: [BookingService, PricingService, SeatLockService, TicketService, CouponService, ShiftService, ApiKeyService, ConfigService],
  exports: [BookingService], // consumed by PaymentModule to confirm bookings
})
export class BookingModule {}
