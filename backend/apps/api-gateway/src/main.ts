import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { ApiGatewayModule } from './api-gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);

  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('TransportOS API')
    .setDescription('Pakistan\'s Premier Bus Ticketing Platform — API Gateway')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication & registration')
    .addTag('Users', 'User profile management')
    .addTag('Routes', 'Bus routes')
    .addTag('Buses', 'Fleet management')
    .addTag('Trips', 'Trip search & scheduling')
    .addTag('Bookings', 'Seat booking & cancellation')
    .addTag('Payments', 'JazzCash / EasyPaisa payments')
    .addTag('Tracking', 'Live bus tracking')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port);
  console.log(`\n🚌 TransportOS API Gateway running at http://localhost:${port}`);
  console.log(`📖 Swagger docs: http://localhost:${port}/docs\n`);
}
bootstrap();
