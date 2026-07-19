import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { User } from './entities/user.entity';
import { Otp } from './entities/otp.entity';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { AdminService } from './services/admin.service';
import { LoyaltyService } from './services/loyalty.service';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { AdminController } from './controllers/admin.controller';
import { LoyaltyController } from './controllers/loyalty.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { WalletService } from './services/wallet.service';
import { WalletController } from './controllers/wallet.controller';
import { Dispute } from './entities/dispute.entity';
import { DisputeService } from './services/dispute.service';
import { DisputesController } from './controllers/disputes.controller';
import { Settlement } from './entities/settlement.entity';
import { SettlementService } from './services/settlement.service';
import { CompanyProfile } from './entities/company-profile.entity';
import { CompanyService } from './services/company.service';
import { City, Banner, PlatformSetting } from './entities/catalog.entity';
import { CatalogService } from './services/catalog.service';
import { CatalogController } from './controllers/catalog.controller';
import { ComplianceDocument } from './entities/compliance-document.entity';
import { ComplianceService } from './services/compliance.service';
import { Booking } from '../../booking-service/src/entities/booking.entity';
import { Payment } from '../../payment-service/src/entities/payment.entity';
import { Bus } from '../../fleet-service/src/entities/bus.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'transport-os-secret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    TypeOrmModule.forFeature([User, Otp, LoyaltyTransaction, WalletTransaction, Dispute, Booking, Payment, Settlement, CompanyProfile, Bus, City, Banner, PlatformSetting, ComplianceDocument]),
  ],
  controllers: [AuthController, UserController, AdminController, LoyaltyController, WalletController, DisputesController, CatalogController],
  providers: [AuthService, UserService, AdminService, SettlementService, CompanyService, CatalogService, ComplianceService, LoyaltyService, WalletService, DisputeService, JwtStrategy],
  exports: [WalletService, CompanyService],
})
export class UserModule {}
