import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import { BookingModule } from '../../booking-service/src/booking.module';
import { UserModule } from '../../user-service/src/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Payment]),
    BookingModule, // for BookingService.confirm / findById
    UserModule, // for WalletService (pay from wallet)
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
