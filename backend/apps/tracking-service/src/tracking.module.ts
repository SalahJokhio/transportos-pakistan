import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { TrackingGateway } from './tracking.gateway';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './services/tracking.service';
import { GpsLog } from './entities/gps-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([GpsLog]),
  ],
  controllers: [TrackingController],
  providers: [TrackingGateway, TrackingService],
})
export class TrackingModule {}
