import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { Route } from './entities/route.entity';
import { Bus } from './entities/bus.entity';
import { Trip } from './entities/trip.entity';
import { DriverReview } from './entities/driver-review.entity';
import { TripReport } from './entities/trip-report.entity';
import { Employee } from './entities/employee.entity';
import { User } from '../../user-service/src/entities/user.entity';
import { RouteService } from './services/route.service';
import { BusService } from './services/bus.service';
import { TripService } from './services/trip.service';
import { DriverRecordService } from './services/driver-record.service';
import { TripReportService } from './services/trip-report.service';
import { FleetAnalyticsService } from './services/fleet-analytics.service';
import { EmployeeService } from './services/employee.service';
import { RouteController } from './controllers/route.controller';
import { BusController } from './controllers/bus.controller';
import { TripController } from './controllers/trip.controller';
import { OperatorController } from './controllers/operator.controller';
import { DriverController } from './controllers/driver.controller';
import { DriversController } from './controllers/drivers.controller';
import { BookingModule } from '../../booking-service/src/booking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Route, Bus, Trip, DriverReview, TripReport, Employee, User]),
    BookingModule, // for operator dashboard booking/revenue stats
  ],
  controllers: [
    RouteController,
    BusController,
    TripController,
    OperatorController,
    DriverController,
    DriversController,
  ],
  providers: [RouteService, BusService, TripService, DriverRecordService, TripReportService, FleetAnalyticsService, EmployeeService],
})
export class FleetModule {}
