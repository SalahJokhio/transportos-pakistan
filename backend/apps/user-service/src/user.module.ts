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
import { Booking } from '../../booking-service/src/entities/booking.entity';

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
    TypeOrmModule.forFeature([User, Otp, LoyaltyTransaction, Booking]),
  ],
  controllers: [AuthController, UserController, AdminController, LoyaltyController],
  providers: [AuthService, UserService, AdminService, LoyaltyService, JwtStrategy],
})
export class UserModule {}
