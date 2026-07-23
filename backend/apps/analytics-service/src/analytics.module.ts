import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ExecutiveCopilotController } from './executive-copilot.controller';
import { ExecutiveCopilotService } from './executive-copilot.service';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { GenerativeController } from './generative.controller';
import { GenerativeService } from './generative.service';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';
import { PredictiveController } from './predictive.controller';
import { PredictiveService } from './predictive.service';
import { AiGatewayController } from './ai-gateway.controller';
import { Booking } from '../../booking-service/src/entities/booking.entity';
import { TripReport } from '../../fleet-service/src/entities/trip-report.entity';
import { Employee } from '../../fleet-service/src/entities/employee.entity';
import { KnowledgeModule } from '../../automation-service/src/knowledge/knowledge.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Booking, TripReport, Employee]),
    KnowledgeModule, // RAG grounding for the Copilot
  ],
  controllers: [AnalyticsController, ExecutiveCopilotController, SimulationController, GenerativeController, KpiController, PredictiveController, AiGatewayController],
  providers: [AnalyticsService, ExecutiveCopilotService, SimulationService, GenerativeService, KpiService, PredictiveService],
})
export class AnalyticsModule {}
