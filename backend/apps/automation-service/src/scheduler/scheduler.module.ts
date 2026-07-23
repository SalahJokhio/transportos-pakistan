import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledJob } from './scheduler.entity';
import { PlatformEvent } from '../entities/platform-event.entity';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';

/** Scheduling + Automation Engine. EventBusService is global (AutomationModule). */
@Module({
  imports: [TypeOrmModule.forFeature([ScheduledJob, PlatformEvent, AutomationAlert])],
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
