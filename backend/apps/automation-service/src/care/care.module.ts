import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LostItem, SosEvent } from './care.entities';
import { AutomationAlert } from '../entities/automation-alert.entity';
import { CareService } from './care.service';
import { CareController } from './care.controller';

/** Lost & Found + Emergency SOS. EventBusService is global (AutomationModule). */
@Module({
  imports: [TypeOrmModule.forFeature([LostItem, SosEvent, AutomationAlert])],
  controllers: [CareController],
  providers: [CareService],
})
export class CareModule {}
