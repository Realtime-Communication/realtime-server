# Chat Module

A simplified, maintainable chat module following the patterns used in other modules like `common`, `config`, and `core`.

## Structure

```
src/chat/
├── chat.module.ts          # Main module
├── chat.controller.ts      # HTTP endpoints
├── chat.gateway.ts         # WebSocket gateway
├── chat.service.ts         # Core business logic
├── dto/                    # Data transfer objects
│   ├── message.dto.ts      # Message-related DTOs
│   ├── call.dto.ts         # Call-related DTOs
│   └── index.ts            # DTO exports
├── entities/               # Type definitions
│   ├── message.entity.ts   # Message and presence entities
│   └── index.ts            # Entity exports
├── guards/                 # Authentication guards
│   └── ws-jwt.guard.ts     # WebSocket JWT guard
├── utils/                  # Utilities
│   ├── room.util.ts        # Room management utilities
│   └── security.util.ts    # Security utilities
└── index.ts                # Module exports
```

## Features

- **Real-time messaging**: Send/receive messages via WebSocket
- **Voice/Video calls**: Initiate and manage calls
- **Presence management**: Track online/offline users
- **Security**: Rate limiting, content filtering, spam detection
- **Room management**: Friend and group conversations
- **Message operations**: Create, update, delete messages

## Usage

### Import the module

```typescript
import { ChatModule } from 'src/chat';

@Module({
  imports: [ChatModule],
})
export class AppModule {}
```

### Use the service

```typescript
import { ChatService } from 'src/chat';

@Injectable()
export class SomeService {
  constructor(private readonly chatService: ChatService) {}

  async sendMessage(user: TAccountRequest, messageDto: CreateMessageDto) {
    return this.chatService.saveMessage(user, messageDto);
  }
}
```

## Key Benefits

1. **Simplified**: Single service handles all chat operations
2. **Maintainable**: Clear structure following established patterns
3. **Focused**: Essential features without over-engineering
4. **Consistent**: Follows same patterns as other modules
5. **Testable**: Simple dependencies and clear interfaces

## Dependencies

- `PrismaModule`: Database operations
- `AuthModule`: Authentication
- `ConfigModule`: Configuration management
- Redis: Caching and real-time features 
