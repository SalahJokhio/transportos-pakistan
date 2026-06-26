import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { Booking } from './entities/booking.entity';
import { BookingSeat } from './entities/booking-seat.entity';
import { BookingService } from './services/booking.service';
import { PricingService } from './services/pricing.service';
import { SeatLockService } from './services/seat-lock.service';
import { TicketService } from './services/ticket.service';
import { BookingController } from './booking.controller';

// Shared DB entities for loyalty auto-earn, seat release and ticket details
import { User } from '../../user-service/src/entities/user.entity';
import { LoyaltyTransaction } from '../../user-service/src/entities/loyalty-transaction.entity';
import { Trip } from '../../fleet-service/src/entities/trip.entity';
import { Route } from '../../fleet-service/src/entities/route.entity';
import { Bus } from '../../fleet-service/src/entities/bus.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Booking, BookingSeat, User, LoyaltyTransaction, Trip, Route, Bus]),
  ],
  controllers: [BookingController],
  providers: [BookingService, PricingService, SeatLockService, TicketService, ConfigService],
  exports: [BookingService], // consumed by PaymentModule to confirm bookings
})
export class BookingModule {}
