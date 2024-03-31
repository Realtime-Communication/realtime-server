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
import redisClient from './redis/redis.client';
import { RedisIoAdapter } from './redis/redis.adapter';



async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Redis Caching Websocket 
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  async () => {
    redisClient.on('error', async (err) => await redisClient.connect());
    redisClient.on('disconnect', async () => {
      console.log('Disconnect');
      await redisClient.connect();
    });
    await redisClient.connect();
  }

  app.enableCors();

  // API Versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ['1']
  });

  // Template engine
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('ejs');

  // Reflector & metatdata, Guards, Interceptor
  const reflector = app.get( Reflector );
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.useGlobalGuards( new JwtAuthGuard(reflector) );
  app.useGlobalGuards( new RolesGuard(reflector) );

  await app.listen(configService.get<string>("PORT"));
}

bootstrap();
