import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
