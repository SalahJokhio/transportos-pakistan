import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformEvent } from './entities/platform-event.entity';
import { AutomationRule } from './entities/automation-rule.entity';
import { AutomationAlert } from './entities/automation-alert.entity';
import { InboxNotification } from './inbox/inbox.entity';
import { EventBusService } from './services/event-bus.service';
import { RulesEngineService } from './services/rules-engine.service';
import { AutomationService } from './services/automation.service';
import { AutomationController } from './automation.controller';
import { NotificationModule } from '../../notification-service/src/notification.module';

/**
 * Rules + Event Engine. Global so any service can inject EventBusService to
 * emit events; the Rules Engine then fires configured actions. Foundation for
 * the wider Workflow / Automation / AI layers.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([PlatformEvent, AutomationRule, AutomationAlert, InboxNotification]),
    NotificationModule,
  ],
  controllers: [AutomationController],
  providers: [EventBusService, RulesEngineService, AutomationService],
  exports: [EventBusService, RulesEngineService],
})
export class AutomationModule {}
