import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

// Core modules
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

// Chat module components
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';

// Event handlers
import { 
  ConnectionHandler, 
  MessageHandler, 
  CallHandler, 
  RealtimeEventHandler 
} from './handlers';

// Queue and cache services
import { 
  MessageQueueService, 
  MessageProcessorService, 
  CacheManagerService,
  PerformanceService
} from './services';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    ChatController,
  ],
  providers: [
    // Core services
    ChatService,
    ChatGateway,
    WsJwtGuard,
    JwtService,
    
    // Event handlers
    ConnectionHandler,
    MessageHandler,
    CallHandler,
    RealtimeEventHandler,
    
    // Queue and cache services
    MessageQueueService,
    MessageProcessorService,
    CacheManagerService,
    PerformanceService,
  ],
  exports: [
    ChatService,
    MessageQueueService,
    MessageProcessorService,
    CacheManagerService,
    PerformanceService,
  ],
})
export class ChatModule {} 
