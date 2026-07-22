import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../../../fleet-service/src/entities/trip.entity';
import { Bus } from '../../../fleet-service/src/entities/bus.entity';
import { Route } from '../../../fleet-service/src/entities/route.entity';
import { Employee } from '../../../fleet-service/src/entities/employee.entity';
import { TripReport } from '../../../fleet-service/src/entities/trip-report.entity';
import { SupportTicket } from '../../../user-service/src/entities/support-ticket.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { WorkflowModule } from '../workflow/workflow.module';

/**
 * Department AI Agents. Reads fleet/HR/CRM/booking data and acts through the
 * engines (EventBusService is global; WorkflowService starts approval chains).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, Bus, Route, Employee, TripReport, SupportTicket, AutomationAlert]),
    WorkflowModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
