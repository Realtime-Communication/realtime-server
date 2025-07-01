import { Module } from '@nestjs/common';
import { ChatGateway } from './realtime.gateway';
import { MessageController } from './message.controller';
import { ChatService } from './message.service';
import { UsersModule } from 'src/users/users.module';
import { CacheManager } from './cache.service';
import { FriendModule } from 'src/friends/friends.module';
import { ConfigModule } from '@nestjs/config';
import { WsJwtGuard } from './ws.guard';
import { AuthModule } from 'src/auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { MessageHandler } from './handlers/message.handler';
import { CallHandler } from './handlers/call.handler';
import { ConnectionHandler } from './handlers/connection.handler';
import { WebSocketSecurityService } from './websocket-security.service';
import { PresenceService } from './services/presence.service';
import { WebSocketEventService } from './services/websocket-event.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { WebSocketConfig } from './config/websocket.config';

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    FriendModule,
    AuthModule,
    PrismaModule,
    ThrottlerModule.forRoot([WebSocketConfig.throttle]),
  ],
  providers: [
    ChatGateway,
    ChatService,
    CacheManager,
    WsJwtGuard,
    MessageHandler,
    CallHandler,
    ConnectionHandler,
    WebSocketSecurityService,
    PresenceService,
    WebSocketEventService,
  ],
  controllers: [MessageController],
  exports: [
    ChatService,
    CacheManager,
    WebSocketSecurityService,
    PresenceService,
    WebSocketEventService,
  ],
})
export class ChatModule {}
