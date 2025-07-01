# Chat Module - Refactored Architecture

## Overview

The chat module has been completely refactored to provide a modular, scalable, and maintainable WebSocket-based real-time communication system.

## Architecture

### Core Components

1. **Gateway Layer**
   - `ChatGateway` - Main WebSocket entry point

2. **Handler Layer** 
   - `BaseHandler` - Common functionality for all handlers
   - `MessageHandler` - Message operations (send, delete, typing)
   - `CallHandler` - Voice/video call management  
   - `ConnectionHandler` - Connection lifecycle management

3. **Service Layer**
   - `ChatService` - Business logic for messages/conversations
   - `CacheManager` - Redis-based session management
   - `WebSocketSecurityService` - Security and rate limiting
   - `PresenceService` - User online status tracking
   - `WebSocketEventService` - Event broadcasting utilities

4. **Guard Layer**
   - `WsJwtGuard` - Enhanced JWT authentication

## Key Features

### Security
- IP blocking for suspicious activity
- Per-user rate limiting  
- Content filtering and spam detection
- File upload validation
- Enhanced token verification

### Real-time Communication
- Message sending/receiving
- Typing indicators
- Read receipts
- Presence status updates
- Voice/video calling
- Group and direct messaging

### Scalability
- Modular handler system
- Redis caching
- Room-based broadcasting
- Event-driven architecture

## Configuration

Central configuration in `config/websocket.config.ts` includes:
- CORS settings
- Security parameters
- Rate limiting rules
- Spam detection patterns

## Adding New Features

1. Create handler extending `BaseHandler`
2. Add event handler to `ChatGateway`
3. Register in `ChatModule`

## Event Broadcasting

Use `WebSocketEventService` for:
- User-specific events
- Conversation events  
- Global broadcasts
- Presence updates

## Security Features

- Rate limiting: `checkMessageRateLimit(userId)`
- Content filtering: `filterContent(content)`
- File validation: `validateFileUpload(filename, mimeType, size)`
- IP security: `checkIPSecurity(ip)`

## Monitoring

Built-in statistics for:
- Connection counts
- Event tracking
- Security incidents
- Performance metrics 
