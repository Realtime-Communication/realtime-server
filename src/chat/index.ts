// Main module
export { ChatModule } from './chat.module';

// Core services
export { ChatService } from './chat.service';
export { ChatController } from './chat.controller';
export { ChatGateway } from './chat.gateway';

// DTOs
export * from './dto';

// Entities
export * from './entities';

// Guards
export { WsJwtGuard, AuthenticatedSocket } from './guards/ws-jwt.guard';

// Utilities
export { RoomUtil } from './utils/room.util';
export { SecurityUtil } from './utils/security.util'; 
