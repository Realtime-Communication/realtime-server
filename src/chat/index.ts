// Gateway
export { ChatGateway } from './realtime.gateway';

// Services
export { ChatService } from './message.service';
export { CacheManager } from './cache.service';
export { WebSocketSecurityService } from './websocket-security.service';
export { PresenceService } from './services/presence.service';
export { WebSocketEventService } from './services/websocket-event.service';

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

// Module
export { ChatModule } from './realtime.module'; 
