import { NestFactory } from '@nestjs/core';
import { AnalyticsModule } from './analytics.module';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.ANALYTICS_SERVICE_PORT || 3007);
}
bootstrap();
