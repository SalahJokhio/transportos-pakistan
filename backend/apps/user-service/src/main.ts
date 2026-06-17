import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UserModule } from './user.module';

async function bootstrap() {
  const app = await NestFactory.create(UserModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('User Service')
    .setDescription('TransportOS User Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.USER_SERVICE_PORT || 3001;
  await app.listen(port);
  console.log(`User Service running on port ${port}`);
}
bootstrap();
