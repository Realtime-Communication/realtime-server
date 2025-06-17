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
import { ChatModule } from './chat/realtime.module';
import { AllExceptionsFilter } from './exception/global.exception';

class CallChatApplication {
  public static async bootstrap(args: string[]): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);

    // Redis Caching Websocket
    // const redisIoAdapter = new RedisIoAdapter(app);
    // await redisIoAdapter.connectToRedis();
    // app.useWebSocketAdapter(redisIoAdapter);
    // async () => {
    //   redisClient.on('error', async () => await redisClient.connect());
    //   redisClient.on('disconnect', async () => {
    //     console.log('Disconnect');
    //     await redisClient.connect();
    //   });
    //   await redisClient.connect();
    // };

    // Swagger
    const config = new DocumentBuilder()
      .setTitle('Talk Together')
      .setDescription('API Description')
      .setVersion('1.0')
      .build();

    const options: SwaggerDocumentOptions = {
      deepScanRoutes: true,
      ignoreGlobalPrefix: true,
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
    };
    const document = SwaggerModule.createDocument(app, config, options);
    SwaggerModule.setup('api', app, document);

    app.enableCors();

    // --- API Versioning
    // app.setGlobalPrefix('api');
    // app.enableVersioning({
    //   type: VersioningType.URI,
    //   defaultVersion: ['1'],
    // });

    // Template engine
    // app.useStaticAssets(join(__dirname, '..', 'public'));
    // app.setBaseViewsDir(join(__dirname, '..', 'views'));
    // app.setViewEngine('ejs');

    // Reflector & metatdata, Guards, Interceptor
    const reflector = app.get(Reflector);
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true, // <- this is critical
      }),
    );

    // app.useGlobalGuards(new RolesGuard(reflector));
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalGuards(new JwtAuthGuard(reflector));
    app.useGlobalInterceptors(new TransformInterceptor(reflector));

    await app.listen(configService.get<string>('PORT'));

  }
}

CallChatApplication.bootstrap(['Chat App V1']);
