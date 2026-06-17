import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AiController],
})
export class AiModule {}
