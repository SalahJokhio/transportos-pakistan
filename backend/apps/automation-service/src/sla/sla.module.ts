import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlaConfig, SlaEscalation } from './sla.entities';
import { SupportTicket } from '../../../user-service/src/entities/support-ticket.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';

/** SLA + Escalation Engine. EventBusService is global (AutomationModule). */
@Module({
  imports: [TypeOrmModule.forFeature([SlaConfig, SlaEscalation, SupportTicket, AutomationAlert])],
  controllers: [SlaController],
  providers: [SlaService],
})
export class SlaModule {}
