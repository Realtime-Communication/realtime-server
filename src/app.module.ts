import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/realtime.module';
import { CacheModule, CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { RedisModule } from '@nestjs-modules/ioredis';
import { redisStore } from 'cache-manager-redis-store';
import { PrismaModule } from './common/prisma/prisma.module';
import { FriendModule } from './friends/friends.module';
import { ConversationService } from './groups/conversations.service';
import { ConversationModule } from './groups/conversations.module';

// export const RedisOptions: CacheModuleAsyncOptions = {
//   isGlobal: true,
//   imports: [ConfigModule],
//   useFactory: async (configService: ConfigService) => {
//     const store = await redisStore({
//       url: process.env.REDIS_URL,
//     });
//     return {
//       store: () => store,
//       ttl: configService.get<string>('REDIS_TTL'),
//       host: configService.get<string>('REDIS_HOST'),
//       port: configService.get<string>('REDIS_PORT'),
//     };
//   },
//   inject: [ConfigService],
// };

@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        options: {
          host: configService.get('REDIS_HOST', 'redis'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
          password: configService.get('REDIS_PASSWORD', 'mypassword'),
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        },
      }),
      inject: [ConfigService],
    }),

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // MongooseModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: async (configService: ConfigService) => ({
    //     uri: configService.get<string>('MONGODB_URL'),
    //   }),
    //   inject: [ConfigService],
    // }),
    // ConfigModule.forRoot({
    //   isGlobal: true,
    // }),
    // CacheModule.registerAsync(RedisOptions),
    UsersModule,
    AuthModule,
    ChatModule,
    ConversationModule,
    PrismaModule,
    RedisModule,
    FriendModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
