import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.NOTIFICATION_SERVICE_PORT || 3006);
}
bootstrap();
