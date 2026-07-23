import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Booking } from '../../../booking-service/src/entities/booking.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { DecisionService } from './decision.service';
import { DecisionController } from './decision.controller';

/** AI Decision Engine. EventBusService is global (AutomationModule). */
@Module({
  imports: [TypeOrmModule.forFeature([Trip, Bus, Route, Booking, AutomationAlert])],
  controllers: [DecisionController],
  providers: [DecisionService],
})
export class DecisionModule {}
