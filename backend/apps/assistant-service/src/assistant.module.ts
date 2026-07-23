import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { StaffAssistantController } from './staff-assistant.controller';
import { StaffAssistantService } from './staff-assistant.service';
import { Trip } from '../../fleet-service/src/entities/trip.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Trip]),
  ],
  controllers: [AssistantController, StaffAssistantController],
  providers: [AssistantService, StaffAssistantService],
})
export class AssistantModule {}
