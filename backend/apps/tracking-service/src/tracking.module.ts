import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TrackingGateway } from './tracking.gateway';
import { TrackingController } from './tracking.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [TrackingController],
  providers: [TrackingGateway],
})
export class TrackingModule {}
