import { NestFactory } from '@nestjs/core';
import { AiModule } from './ai.module';

async function bootstrap() {
  const app = await NestFactory.create(AiModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.AI_SERVICE_PORT || 3008);
}
bootstrap();
