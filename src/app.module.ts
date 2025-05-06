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
import { FriendsModule } from './friends/friends.module';
import { ConversationService } from './groups/conversations.service';

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
      useFactory: () => ({
        type: 'single',
        options: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      }),
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
    ConversationService,
    PrismaModule,
    RedisModule,
    FriendsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
