// This file will be gradually updated as we migrate to Clean Architecture

// Clean Architecture Components
// ----------------------------
// Main module
export { ChatModule } from './chat.module';

// Domain Layer
export { Message, MessageAttachment } from './domain/entities/message.entity';
export { UserPresence as CleanUserPresence, PresenceStatus } from './domain/entities/user-presence.entity';
export { MessageRepository } from './domain/repositories/message.repository';
export { CacheRepository, UserRelationshipGraph as CleanUserGraph, RoomMembership as CleanRoomMembership } from './domain/repositories/cache.repository';
export { 
  MessageQueueRepository,
  EventType,
  PriorityLevel,
  EventBase,
  CallType as CleanCallType
} from './domain/repositories/message-queue.repository';

// Application Layer
export { MessageCommandService } from './application/commands/message.commands';
export { MessageQueryService } from './application/queries/message.queries';

// Infrastructure Layer
export { PrismaMessageRepository } from './infrastructure/persistence/prisma-message.repository';
export { RedisCacheRepository } from './infrastructure/cache/redis-cache.repository';
export { WebSocketConfig as NewWebSocketConfig } from './infrastructure/websocket/websocket.config';

// Interface Layer
export { MessageController as NewMessageController } from './interfaces/http/message.controller';
export { AuthenticatedSocket as NewAuthenticatedSocket } from './interfaces/websocket/types/authenticated-socket.interface';

// Legacy Components (to be gradually migrated)
// -------------------------------------------
// Gateway
export { ChatGateway } from './realtime.gateway';

// Core Services
export { ChatService } from './message.service';
export { CacheManager } from './cache.service';
export { WebSocketSecurityService } from './websocket-security.service';
export { PresenceService } from './services/presence.service';
export { WebSocketEventService } from './services/websocket-event.service';

// Queue and Processing
export { MessageQueueService } from './queue/message-queue.service';
export { EventProcessor } from './processors/event.processor';

// Monitoring
export { PerformanceService } from './monitoring/performance.service';

// Handlers
export { BaseHandler } from './handlers/base.handler';
export { MessageHandler } from './handlers/message.handler';
export { CallHandler } from './handlers/call.handler';
export { ConnectionHandler } from './handlers/connection.handler';

// Guards
export { WsJwtGuard } from './ws.guard';

// Legacy Controllers
export { MessageController } from './message.controller';

// DTOs
export * from './dto/create-message.dto';
export * from './dto/message.vm';
export * from './dto/update-message.dto';
export * from './dto/base.dto';

// Interfaces
export * from './interfaces/authenticated-socket.interface';

// Utils
export { RoomUtil } from './utils/room.util';

// Legacy Config
export { WebSocketConfig } from './config/websocket.config';

// Types
export type { 
  QueuedEvent, 
  MessageEvent, 
  CallEvent 
} from './queue/message-queue.service';

export type {
  UserRelationshipGraph,
  RoomMembership
} from './cache.service';

export type {
  UserPresence
} from './services/presence.service';

export type {
  PerformanceMetrics
} from './monitoring/performance.service';

// Legacy Module
export { ChatModule as RealtimeModule } from './realtime.module';
