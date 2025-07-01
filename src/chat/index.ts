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

// Controllers
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

// Config
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

// Module
export { ChatModule } from './realtime.module'; 
