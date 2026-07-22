import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '@app/database';

// Import all service modules
import { UserModule } from '../../user-service/src/user.module';
import { FleetModule } from '../../fleet-service/src/fleet.module';
import { BookingModule } from '../../booking-service/src/booking.module';
import { TrackingModule } from '../../tracking-service/src/tracking.module';
import { PaymentModule } from '../../payment-service/src/payment.module';
import { NotificationModule } from '../../notification-service/src/notification.module';
import { AiModule } from '../../ai-service/src/ai.module';
import { AnalyticsModule } from '../../analytics-service/src/analytics.module';
import { AssistantModule } from '../../assistant-service/src/assistant.module';
import { CargoModule } from '../../cargo-service/src/cargo.module';
import { AutomationModule } from '../../automation-service/src/automation.module';
import { WorkflowModule } from '../../automation-service/src/workflow/workflow.module';
import { AgentsModule } from '../../automation-service/src/agents/agents.module';
import { PolicyModule } from '../../automation-service/src/policy/policy.module';
import { SlaModule } from '../../automation-service/src/sla/sla.module';
import { ObservabilityModule } from './observability/observability.module';
import { HealthController } from './health.controller';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(), // enables @Cron jobs (reconcile, stale-booking expiry)
    DatabaseModule,
    UserModule,
    FleetModule,
    BookingModule,
    TrackingModule,
    PaymentModule,
    NotificationModule,
    AiModule,
    AnalyticsModule,
    AssistantModule,
    CargoModule,
    AutomationModule, // Rules + Event Engine (global — exports EventBusService)
    WorkflowModule, // Approval Workflow Engine (emits WORKFLOW_* events)
    AgentsModule, // Department AI agents (Dispatch/Finance/Fleet)
    PolicyModule, // Policy Engine (operating limits + violation checks)
    SlaModule, // SLA + Escalation Engine (breach detection + auto-escalation)
    ObservabilityModule, // /metrics + liveness/readiness probes
  ],
  controllers: [HealthController, UploadController],
})
export class ApiGatewayModule {}
