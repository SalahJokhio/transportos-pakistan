import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

/**
 * Department AI Agents. Reads fleet/booking data and acts through the engines
 * (EventBusService is provided globally by AutomationModule).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Trip, Bus, Route, AutomationAlert])],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
