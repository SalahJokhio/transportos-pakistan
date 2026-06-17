import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BookingModule } from './booking.module';

async function bootstrap() {
  const app = await NestFactory.create(BookingModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Booking Service')
    .setDescription('TransportOS Seat Booking API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.BOOKING_SERVICE_PORT || 3003;
  await app.listen(port);
  console.log(`Booking Service running on port ${port}`);
}
bootstrap();
