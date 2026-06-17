import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { Route } from './entities/route.entity';
import { Bus } from './entities/bus.entity';
import { Trip } from './entities/trip.entity';
import { RouteService } from './services/route.service';
import { BusService } from './services/bus.service';
import { TripService } from './services/trip.service';
import { RouteController } from './controllers/route.controller';
import { BusController } from './controllers/bus.controller';
import { TripController } from './controllers/trip.controller';
import { OperatorController } from './controllers/operator.controller';
import { DriverController } from './controllers/driver.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Route, Bus, Trip]),
  ],
  controllers: [RouteController, BusController, TripController, OperatorController, DriverController],
  providers: [RouteService, BusService, TripService],
})
export class FleetModule {}
