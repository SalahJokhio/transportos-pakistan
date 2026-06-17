import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { Booking } from './entities/booking.entity';
import { BookingService } from './services/booking.service';
import { PricingService } from './services/pricing.service';
import { SeatLockService } from './services/seat-lock.service';
import { BookingController } from './booking.controller';

// Shared DB entities for loyalty auto-earn and seat release
import { User } from '../../user-service/src/entities/user.entity';
import { LoyaltyTransaction } from '../../user-service/src/entities/loyalty-transaction.entity';
import { Trip } from '../../fleet-service/src/entities/trip.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Booking, User, LoyaltyTransaction, Trip]),
  ],
  controllers: [BookingController],
  providers: [BookingService, PricingService, SeatLockService, ConfigService],
})
export class BookingModule {}
