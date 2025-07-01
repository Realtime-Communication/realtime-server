# Chat Module - Clean Architecture Refactoring

This module has been refactored to follow Clean Architecture principles. The current state represents an in-progress migration, with both legacy components and new clean architecture components coexisting.

## Clean Architecture Structure

```
src/chat/
  ├── domain/                 # Domain layer (core business rules)
  │   ├── entities/           # Business entities
  │   ├── repositories/       # Repository interfaces
  │   └── services/           # Domain services
  │
  ├── application/            # Application layer (use cases)
  │   ├── commands/           # Command handlers
  │   ├── queries/            # Query handlers
  │   └── dtos/               # DTOs for application layer
  │
  ├── infrastructure/         # Infrastructure layer
  │   ├── persistence/        # Database adapters
  │   ├── cache/              # Cache implementation
  │   ├── messaging/          # Message queue implementation
  │   ├── websocket/          # WebSocket implementation
  │   └── security/           # Security services
  │
  └── interfaces/             # Interface layer
      ├── http/               # HTTP controllers
      ├── websocket/          # WebSocket gateway
      └── dtos/               # DTOs for interfaces
```

## Migration Plan

The module is being migrated to follow Clean Architecture principles:

1. **Domain Layer**: Core business rules and entities
   - Independent of external concerns
   - Defines repository interfaces

2. **Application Layer**: Use cases
   - Contains business logic
   - Depends only on the domain layer
   - Commands & Queries pattern (CQRS-lite)

3. **Infrastructure Layer**: Technical details
   - Implements repositories
   - Handles external systems (database, cache, etc.)
   - Depends on domain layer

4. **Interface Layer**: User interfaces
   - HTTP controllers, WebSocket gateways
   - Input/output adapters
   - Depends on application layer

## Current Status

- ✅ Basic structure created
- ✅ Core domain entities defined
- ✅ Repository interfaces defined
- ✅ Application services created
- ✅ HTTP Controller migrated
- ⬜ WebSocket Gateway migration in progress
- ⬜ Legacy code still in use alongside new architecture

## Benefits of Clean Architecture

- **Maintainability**: Clear separation of concerns
- **Testability**: Core business logic can be tested without external dependencies
- **Flexibility**: External systems can be replaced without affecting core logic
- **Independence**: Domain and application layers are independent of frameworks

## Usage

To use the new clean architecture components:

```typescript
// Import clean architecture components
import {
  ChatModule,
  MessageCommandService,
  MessageQueryService
} from 'src/chat';
```

The `index.ts` file exports both legacy and clean architecture components, with appropriate prefixes to avoid naming conflicts during the migration period. 
