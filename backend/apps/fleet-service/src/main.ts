import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FleetModule } from './fleet.module';

async function bootstrap() {
  const app = await NestFactory.create(FleetModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Fleet Service')
    .setDescription('TransportOS Fleet & Route Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.FLEET_SERVICE_PORT || 3002;
  await app.listen(port);
  console.log(`Fleet Service running on port ${port}`);
}
bootstrap();
