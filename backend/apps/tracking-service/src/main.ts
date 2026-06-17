import { NestFactory } from '@nestjs/core';
import { TrackingModule } from './tracking.module';

async function bootstrap() {
  const app = await NestFactory.create(TrackingModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.TRACKING_SERVICE_PORT || 3005);
  console.log(`Tracking Service running on port ${process.env.TRACKING_SERVICE_PORT || 3005}`);
}
bootstrap();
