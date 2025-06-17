import { Module } from '@nestjs/common';
import { ChatGateway } from './realtime.gateway';
import { MessageController } from './message.controller';
import { ChatService } from './message.service';
import { UsersModule } from 'src/users/users.module';
import { CacheManager } from './cache.service';
import { FriendModule } from 'src/friends/friends.module';
import { ConfigModule, ConfigService } from '@nestjs/config'; // ✅ Import the module, not the service
import { WsJwtGuard } from 'src/chat/ws.guard';
import { JwtModule } from '@nestjs/jwt';
import ms from 'ms';
import { AuthModule } from 'src/auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    UsersModule,
    ConfigModule, // ✅ Correct module import
    FriendModule,
    AuthModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
    ]),
  ],
  providers: [ChatGateway, ChatService, CacheManager, WsJwtGuard],
  controllers: [MessageController],
})
export class ChatModule { }
