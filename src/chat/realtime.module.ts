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
import { MessageQueueService } from './queue/message-queue.service';
import { EventProcessor } from './processors/event.processor';
import { PerformanceService } from './monitoring/performance.service';
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
    // Gateway
    ChatGateway,
    
    // Core Services
    ChatService,
    CacheManager,
    WebSocketSecurityService,
    PresenceService,
    WebSocketEventService,
    
    // Queue and Processing
    MessageQueueService,
    EventProcessor,
    
    // Monitoring
    PerformanceService,
    
    // Handlers
    MessageHandler,
    CallHandler,
    ConnectionHandler,
    
    // Guards
    WsJwtGuard,
  ],
  controllers: [MessageController],
  exports: [
    // Core services for other modules
    ChatService,
    CacheManager,
    WebSocketSecurityService,
    PresenceService,
    WebSocketEventService,
    MessageQueueService,
    EventProcessor,
    PerformanceService,
  ],
})
export class ChatModule {}
