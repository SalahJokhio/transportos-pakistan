import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentConfigService } from './config/payment.config';
import { JazzCashProvider } from './providers/jazzcash.provider';
import { EasypaisaProvider } from './providers/easypaisa.provider';
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
  providers: [PaymentConfigService, JazzCashProvider, EasypaisaProvider, PaymentService],
})
export class PaymentModule {}
