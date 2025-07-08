import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/role.guard';
import { TransformInterceptor } from './core/transform.interceptor';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
// import redisClient from './garbage/redis.client';
// import { RedisIoAdapter } from './garbage/redis.adapter';

import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerDocumentOptions,
} from '@nestjs/swagger';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { AllExceptionsFilter } from './exception/global.exception';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Chat-Chit API')
    .setDescription('Real-time chat application API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Global guards
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  app.useGlobalGuards(new RolesGuard(reflector));

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Set global prefix
  // app.setGlobalPrefix('api');

  // Start the application
  const port = configService.get<number>('PORT') || 8000;
  await app.listen(port);
  
  // Log system configuration
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`RabbitMQ URL: ${configService.get('RABBITMQ_URL', 'Not configured')}`);
  console.log(`Redis Host: ${configService.get('REDIS_HOST', 'localhost')}:${configService.get('REDIS_PORT', 6379)}`);
  console.log('🚀 RabbitMQ-powered chat system initialized');
}

bootstrap().catch(err => {
  console.error('Error starting the application', err);
  process.exit(1);
});
