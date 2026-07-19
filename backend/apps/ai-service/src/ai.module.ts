import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { AiController } from './ai.controller';
import { PricingAiService } from './pricing-ai.service';
import { Trip } from '../../fleet-service/src/entities/trip.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Trip]),
  ],
  controllers: [AiController],
  providers: [PricingAiService],
})
export class AiModule {}
