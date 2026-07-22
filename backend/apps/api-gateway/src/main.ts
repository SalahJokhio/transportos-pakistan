import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { join } from 'path';
import { ApiGatewayModule } from './api-gateway.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ApiGatewayModule);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*' });

  // Serve uploaded incident/expense photos at /uploads/<file>.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Ops endpoints stay at the root (Prometheus scrapes /metrics; k8s probes
  // hit /health/live and /health/ready) — everything else lives under /api/v1.
  app.setGlobalPrefix('api/v1', { exclude: ['metrics', 'health/live', 'health/ready'] });

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

  // Railway/Render/Heroku inject PORT; fall back to the service-specific var,
  // then the local default. Bind 0.0.0.0 so the platform can reach the app.
  const port = process.env.PORT || process.env.API_GATEWAY_PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`\n🚌 TransportOS API Gateway running at http://localhost:${port}`);
  console.log(`📖 Swagger docs: http://localhost:${port}/docs\n`);
}
bootstrap();
