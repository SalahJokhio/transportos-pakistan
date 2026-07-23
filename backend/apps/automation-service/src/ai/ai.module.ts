import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiFeedback } from './ai.entities';
import { Booking } from '../../../booking-service/src/entities/booking.entity';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

/** AI Memory + Governance (personalization profile + suggestion feedback loop). */
@Module({
  imports: [TypeOrmModule.forFeature([AiFeedback, Booking])],
  controllers: [AiController],
  providers: [AiService],
})
export class AiInsightsModule {}
