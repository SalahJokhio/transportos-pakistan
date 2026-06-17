import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PaymentModule } from './payment.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');
  const config = new DocumentBuilder()
    .setTitle('Payment Service').setDescription('JazzCash / EasyPaisa').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(process.env.PAYMENT_SERVICE_PORT || 3004);
}
bootstrap();
