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
import { AuditLog } from './entities/audit-log.entity';
import { AuditService, AuditInterceptor } from './services/audit.service';
import { Broadcast } from './entities/broadcast.entity';
import { BroadcastService } from './services/broadcast.service';
import { SupportTicket, SupportMessage } from './entities/support-ticket.entity';
import { SupportService } from './services/support.service';
import { SupportController } from './controllers/support.controller';
import { SavedTraveler, SavedAddress, NotificationPreference } from './entities/profile-extras.entities';
import { ProfileExtrasService } from './services/profile-extras.service';
import { ProfileExtrasController } from './controllers/profile-extras.controller';
import { PlatformOpsService } from './services/platform-ops.service';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { LedgerService } from './services/ledger.service';
import { OperatorLoan } from './entities/operator-loan.entity';
import { LendingService } from './services/lending.service';
import { LendingController } from './controllers/lending.controller';
import { NotificationModule } from '../../notification-service/src/notification.module';
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
    NotificationModule, // broadcast SMS/WhatsApp sender
    TypeOrmModule.forFeature([User, Otp, LoyaltyTransaction, WalletTransaction, Dispute, Booking, Payment, Settlement, CompanyProfile, Bus, City, Banner, PlatformSetting, ComplianceDocument, AuditLog, Broadcast, SupportTicket, SupportMessage, LedgerEntry, OperatorLoan, SavedTraveler, SavedAddress, NotificationPreference]),
  ],
  controllers: [AuthController, UserController, AdminController, LoyaltyController, WalletController, DisputesController, CatalogController, SupportController, LendingController, ProfileExtrasController],
  providers: [AuthService, UserService, AdminService, SettlementService, CompanyService, CatalogService, ComplianceService, AuditService, AuditInterceptor, BroadcastService, SupportService, PlatformOpsService, LedgerService, LendingService, LoyaltyService, WalletService, DisputeService, ProfileExtrasService, JwtStrategy],
  exports: [WalletService, CompanyService, LedgerService],
})
export class UserModule {}
