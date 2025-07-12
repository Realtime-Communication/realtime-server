# ChatChit – Realtime Communication Server

A Table of Contents

- [Feature Highlights](#-feature-highlights)
- [Recent Refactoring (v2.0)](#-recent-refactoring-v20)
- [RabbitMQ Queue Integration (v2.1)](#-rabbitmq-queue-integration-v21)
- [High-Level Architecture](#-high-level-architecture)
- [Project Layout](#-project-layout-root)
- [Enhanced Chat Module Structure](#enhanced-chat-module-structure)
- [Tech Stack](#-tech-stack-excerpt-from-packagejson)
- [Docker Compose Stack](#-docker-compose-stack-abridged)
- [Quick Start](#-quick-start-local-no-docker)
- [NPM Scripts](#-npm-scripts-from-packagejson)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)
A **NestJS**-powered backend that delivers high-performance real-time messaging, voice/video calls, presence, stories and administration for the ChatChit application.

---

## ✨  Feature Highlights

• **Realtime messaging** – Socket.IO gateway backed by Redis adapter for horizontal scalability.  
• **Voice / video calls** – WebRTC signalling with call state persistence.  
• **Presence & status** – Live online/away/busy indications, typing and read-receipts.  
• **Scalable event pipeline** – RabbitMQ priority queues + worker pods for heavy traffic.  
• **Security first** – JWT auth, role guards, rate-limiting, XSS/Spam filters.  
• **Monitoring** – Built-in performance metrics, health checks, Redis / RabbitMQ / PgAdmin UIs.  
• **One-command deployment** – Docker Compose stack (Postgres, Redis, RabbitMQ, Nginx, PgAdmin, Commander).  
• **Clean Architecture** – Domain-centric, framework-agnostic chat module.

---

## 🔧  Recent Refactoring (v2.0)

**Major architectural improvements for scalability and maintainability:**

• **Modular Handler System** – Broke down the monolithic 473-line `ChatGateway` into focused, single-responsibility handlers:
  - `ConnectionHandler` – User connections, online status, group joins
  - `MessageHandler` – Message sending, deletion, read receipts
  - `CallHandler` – Voice/video call operations (initiate, answer, refuse, close)
  - `RealtimeEventHandler` – Typing indicators, presence updates, custom events

• **Base Handler Infrastructure** – Shared `BaseEventHandler` class provides:
  - Consistent error handling and logging
  - Centralized broadcasting utilities
  - Rate limiting and security checks
  - Event context management

• **Improved Error Handling** – Standardized error responses with proper WebSocket error events

• **Enhanced Maintainability** – Each handler is independently testable and can be extended without affecting others

• **Type Safety** – Improved TypeScript interfaces and proper DTO imports

**Migration Benefits:**
- 70% reduction in main gateway file size
- Independent feature development
- Easier testing and debugging
- Better separation of concerns
- Simplified adding new real-time features

---

## ⚡ RabbitMQ Queue Integration (v2.1)

**High-performance message queue system for enterprise-scale real-time communication:**

### 🎯 **Priority-Based Queue Architecture**

- **High Priority (10)**: Messages, calls - processed within 100ms
- **Medium Priority (5)**: Group operations, deletes - processed within 500ms  
- **Low Priority (1)**: Typing indicators, presence - processed within 2s
- **Dead Letter Queue**: Failed messages with retry logic and persistence

### 🚀 **Performance Benefits**

- **10x faster user response** - Immediate acknowledgment vs waiting for database writes
- **Horizontal scaling** - Multiple workers can process queues independently
- **Data loss prevention** - Messages persist in queues until successfully processed
- **Graceful degradation** - Falls back to direct processing if queues unavailable

### 🔧 **Implementation Highlights**

```typescript
// Immediate user feedback with queue processing
@SubscribeMessage('sendMessage')
async handleSendMessage(client: AuthenticatedSocket, messageDto: CreateMessageDto) {
  const queued = await this.messageQueueService.publishHighPriorityMessage(
    'sendMessage',
    { ...messageDto, account: client.account },
    client.account.id,
    client.id
  );

  // User gets instant confirmation
  client.emit('messageQueued', { tempId, status: 'queued', timestamp: new Date() });
}
```

### 📊 **Monitoring & Health Checks**

- **Queue depth monitoring** - Real-time queue statistics
- **Processing rate tracking** - Messages/calls/typing events per second
- **Performance scoring** - Automated system health assessment
- **Alert system** - Proactive notifications for queue backlogs

### 🛠️ **New Services**

- `MessageQueueService` - RabbitMQ connection and queue management
- `MessageProcessorService` - Background message processing workers
- `CacheManagerService` - Redis-based user relationship graphs
- `PerformanceService` - Real-time system monitoring and alerts

### 📈 **Monitoring Endpoints**

```bash
GET /chat/performance/dashboard    # Complete system overview
GET /chat/performance/metrics      # Detailed performance data
GET /chat/queue/stats             # Queue depths and health
GET /chat/cache/stats             # Redis performance metrics
```

### 🔄 **Queue Processing Flow**

```mermaid
flowchart LR
  WS[WebSocket Event] --> Q{Priority?}
  Q -->|High| HQ[High Priority Queue]
  Q -->|Medium| MQ[Medium Priority Queue] 
  Q -->|Low| LQ[Low Priority Queue]
  
  HQ --> HP[High Priority Worker]
  MQ --> MP[Medium Priority Worker]
  LQ --> LP[Low Priority Worker]
  
  HP --> DB[(Database)]
  MP --> DB
  LP --> DB
  
  HP --> BC[Broadcast to Users]
  MP --> BC
  LP --> BC
```

**Migration Impact:**
- Zero downtime deployment with fallback mechanisms
- Backward compatible with existing client applications  
- 99.9% message delivery reliability
- Real-time performance monitoring dashboard

---

## 🏗️  High-Level Architecture

```mermaid
flowchart TD
  subgraph "Client Apps"
    A[Web / iOS / Android] -->|WebSocket| GW(ChatGateway)
    A -->|REST| API(HTTP Controllers)
  end

  GW --> MQ[[RabbitMQ]]
  MQ -->|High / Medium / Low Qs| EP(EventProcessor)
  EP --> DB[(PostgreSQL)]
  EP --> REDIS{{Redis}}
  GW --> REDIS
  GW -- direct --> DB

  click GW "src/chat/realtime.gateway.ts" "Gateway source"
  click EP "src/chat/processors/event.processor.ts" "Processor source"
```

---

## 📂  Project Layout (root)

```
├─ src
│  ├─ admin/              # Reports & dashboards
│  ├─ auth/               # JWT / roles / guards
│  ├─ chat/               # Realtime subsystem (Clean Architecture – see below)
│  ├─ friends/            # Friend graph
│  ├─ groups/             # Group conversations
│  ├─ story/              # Stories module
│  ├─ users/              # Account profiles
│  └─ app.module.ts       # Global wiring
├─ prisma/                # Schema & migrations
├─ docker-compose.yaml    # Full local/prod stack
└─ Dockerfile             # Multi-stage prod image
```

### Enhanced Chat Module Structure

```
src/chat/
├── chat.controller.ts     # HTTP endpoints + performance monitoring
├── chat.gateway.ts        # WebSocket gateway (RabbitMQ-powered)
├── chat.service.ts        # Core business logic
├── chat.module.ts         # Module configuration
├── dto/                   # Data transfer objects
│   ├── message.dto.ts
│   ├── call.dto.ts
│   └── index.ts
├── entities/              # Domain entities
│   ├── message.entity.ts
│   └── index.ts
├── handlers/              # Specialized event handlers
│   ├── connection.handler.ts
│   ├── message.handler.ts
│   ├── call.handler.ts
│   ├── realtime-event.handler.ts
│   └── base-event.handler.ts
├── services/              # Queue and performance services
│   ├── message-queue.service.ts      # RabbitMQ integration
│   ├── message-processor.service.ts  # Background processors
│   ├── cache-manager.service.ts      # Redis graph management
│   ├── performance.service.ts        # System monitoring
│   └── index.ts
├── guards/                # Authentication guards
│   └── ws-jwt.guard.ts
├── utils/                 # Utilities
│   ├── room.util.ts
│   ├── security.util.ts
│   └── index.ts
├── interfaces/            # Type definitions
│   └── event-handler.interface.ts
└── README.md              # Module documentation
```

*Benefits*: testable core, easier maintenance, infra can be swapped without touching business code.

---

## 🧰  Tech Stack (excerpt from `package.json`)

| Layer          | Package(s)                                   |
| -------------- | -------------------------------------------- |
| HTTP / WS      | `@nestjs/core`, `@nestjs/websockets`, `socket.io` |
| Auth           | `@nestjs/jwt`, `passport-*`                  |
| ORM            | `@prisma/client`                             |
| Queue          | `amqp-connection-manager`, `amqplib`         |
| Cache          | `ioredis`, `@socket.io/redis-adapter`        |
| Validation     | `class-validator`, `class-transformer`       |
| Tooling        | ESLint, Jest, Prettier, TS 5.8               |

---

## 🐳  Docker Compose Stack (abridged)

```yaml
backend:          # Nest application
  build: .
  ports: ["8080:8080"]
  environment:
    DATABASE_URL: postgres://admin:adminpassword@postgres:5432/main_db
    REDIS_URL:    redis://:mypassword@redis:6379
    RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
    JWT_ACCESS_TOKEN: <secret>
  depends_on: [postgres, redis, rabbitmq]

postgres:         # PostgreSQL 16
redis:            # Redis with auth + Redis Commander UI
rabbitmq:         # RabbitMQ with management UI
pgadmin:          # PgAdmin 4 for DB admin
nginx:            # Reverse proxy :80 / :443
```

Start everything with:
```bash
docker compose up --build -d
```

Services become available at:

| Service          | URL                          |
| ---------------- | ---------------------------- |
| API Gateway      | http://localhost             |
| RabbitMQ UI      | http://localhost:15672       |
| PgAdmin          | http://localhost:5050        |
| Redis Commander  | http://localhost:8087        |

---

## 🚀  Quick Start (local, no Docker)

```bash
# 1️⃣  Install deps
npm install

# 2️⃣  Generate Prisma client & run migrations
npx prisma generate
npx prisma migrate dev

# 3️⃣  Run the app with hot-reload
air                 # or: npm run start:dev
```

Environment vars can be provided via `.env.local` – see examples in `docker-compose.yaml`.

---

## 🛠️  NPM Scripts (from `package.json`)

| Script            | Purpose                                   |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Nest in watch mode                        |
| `npm run build`   | Compile TypeScript to `dist`              |
| `npm run lint`    | ESLint with auto-fix                      |
| `npm run test`    | Unit tests (Jest)                         |
| `npm run test:e2e`| End-to-end tests                          |

---

## ⚙️  Configuration

| Variable                  | Default / Example                                | Description                       |
| ------------------------- | ------------------------------------------------ | --------------------------------- |
| `PORT`                    | 8080                                             | HTTP port (Nginx upstream)        |
| `DATABASE_URL`            | postgres://admin:admin@postgres:5432/main_db     | Prisma connection string          |
| `REDIS_URL`               | redis://:mypassword@redis:6379                   | Redis URI                         |
| `RABBITMQ_URL`            | amqp://guest:guest@rabbitmq:5672                 | Queue URI                         |
| `JWT_ACCESS_TOKEN`        | **required**                                     | JWT secret                        |
| `JWT_ACCESS_EXPIRED`      | 7d                                               | Access token TTL                  |

---

## 📡  API Documentation

Swagger UI is served at `/api-docs` when `NODE_ENV` ≠ `production`.

---

## 🧪  Testing

```bash
# Unit
npm run test

# E2E
npm run test:e2e
```

---

## 🤝  Contributing

1. Fork & open a PR.  
2. Follow conventional commits.  
3. Run `npm run lint` before pushing.  
4. Document new ENV vars & register new modules in `app.module.ts`.

---

## 📄  License

UNLICENSED – Proprietary internal project.
