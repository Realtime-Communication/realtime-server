# Realtime Server (NestJS)

A scalable real-time communication backend built with **NestJS**, **RabbitMQ**, **PostgreSQL**, **Redis** and **WebSockets**.  
It powers chat, calls, presence, stories and admin features for the ChatChit application.

---

## ✨ Features

• **Modular architecture** – each domain (auth, chat, friends, stories …) lives in its own Nest module.  
• **Realtime messaging & calls** – Socket.IO gateway + RabbitMQ priority queues for heavy-traffic events.  
• **Horizontal scaling** – stateless Node containers, Redis for socket adapter & cache, RabbitMQ for event fan-out.  
• **Database** – PostgreSQL accessed through Prisma ORM (binary client).  
• **Security** – JWT auth, rate-limiting, XSS filtering, role-based guards.  
• **Monitoring** – built-in performance service, health-check endpoints, RabbitMQ / Redis CLI UI.  
• **Docker-first** – single-command local or prod deployment with Docker Compose + Nginx reverse proxy.

---

## 📂 Project structure (high-level)

```
├─ src
│  ├─ auth/              # Authentication & authorization
│  ├─ chat/              # WS gateway, handlers, queues, processors
│  ├─ friends/           # Friend management
│  ├─ groups/            # Group conversations
│  ├─ story/             # Stories module
│  ├─ admin/             # Admin dashboards & reports
│  ├─ common/            # Shared util, filters, DTOs, enum …
│  └─ app.module.ts      # Global module wiring
├─ prisma/               # Prisma schema & migrations
├─ docker-compose.yaml   # Multi-service stack (pg, redis, rabbitmq, nginx …)
└─ Dockerfile            # Multi-stage build for prod image
```

---

## 🚀 Quick start

### 1. Prerequisites

- Docker ≥ 24
- Docker-Compose plugin
- Node 22 (only needed for local, non-docker development)

### 2. Clone & boot services

```bash
git clone https://github.com/Realtime-Communication/realtime-server.git
cd realtime-server

# Spin up stack (backend + db + redis + rabbitmq + nginx)
docker compose up --build -d
```

Navigate to:

- **API** – http://localhost:80 (proxied by Nginx)
- **RabbitMQ UI** – http://localhost:15672 (guest / guest)
- **PgAdmin** – http://localhost:5050 (admin / admin)
- **Redis Commander** – http://localhost:8087

### 3. Local (no Docker)

```bash
# Install deps
npm install
# Generate Prisma client & run migrations
npx prisma generate
npx prisma migrate dev
# Launch dev mode with hot-reload
air   # or: npm run start:dev
```

Environment variables can be provided via `.env` / `.env.local` (see examples below).

---

## 🐳 Docker Compose services (excerpt)

```yaml
backend: # Nest app
  build: .
  environment:
    DATABASE_URL: postgres://admin:adminpassword@postgres:5432/main_db
    REDIS_URL: redis://:mypassword@redis:6379
    RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
    JWT_ACCESS_TOKEN: <secret>
  depends_on: [postgres, redis, rabbitmq]

rabbitmq:
  image: rabbitmq:3.13-management
  ports: ['5672:5672', '15672:15672']

redis:
  image: redis:latest
  command: redis-server --requirepass mypassword

postgres:
  image: postgres:16
  environment:
    POSTGRES_USER: admin
    POSTGRES_PASSWORD: adminpassword

nginx:
  image: nginx:1.26-alpine
  ports: ['80:80', '443:443']
```

---

## 🛠️ Important NPM scripts (package.json)

| Script             | Description                  |
| ------------------ | ---------------------------- |
| `npm run dev`      | Start Nest in watch mode     |
| `npm run build`    | Compile TypeScript to `dist` |
| `npm run lint`     | ESLint with auto-fix         |
| `npm run test`     | Unit tests (Jest)            |
| `npm run test:e2e` | E2E tests with supertest     |

---

## 🧩 Module overview (src/app.module.ts)

`AppModule` wires core and feature modules:

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, // PostgreSQL + Prisma
    RedisModule.forRootAsync({
      /* cache config */
    }),
    UsersModule,
    AuthModule,
    ChatModule,
    FriendModule,
    ConversationModule,
    StoryModule,
    AdminModule,
  ],
})
export class AppModule {}
```

---

## ⚙️ Internals

### ChatGateway (`src/chat/realtime.gateway.ts`)

- Central entry-point for every WebSocket connection.
- Applies `WsJwtGuard` for multi-source JWT auth (header, auth payload, query).
- Delegates logic to three feature handlers:
  - **MessageHandler** – content validation, attachment checks, rate-limiting.
  - **CallHandler** – voice/video signalling helpers.
  - **ConnectionHandler** – room joins, presence notification, relationship graph bootstrap.
- Pushes high-frequency events to RabbitMQ via `MessageQueueService` and gives clients an immediate _Queued_ ACK → zero perceived latency.
- Low-latency events (read-receipts, call responses) are executed directly to avoid queue overhead.

#### ⛓️ End-to-end message flow

1. **Socket handshake** – Client opens a WebSocket connection (`/chat`) and sends its JWT in the
   `Authorization` header / query string. `WsJwtGuard` validates and attaches the `userId` to the
   `AuthenticatedSocket` instance.
2. **Join rooms** – `ConnectionHandler` resolves all rooms the user participates in (friends & groups)
   and calls `socket.join(roomId)` for each so that broadcasts are scoped server-side (no DB joins).
3. **Emit** – When a client sends a `message.send` packet:
   ```ts
   {
     roomId: 'abc',
     content: 'Hello 👋',
     clientMsgId: 'tmp-123' // generated on the device for optimistic UI
   }
   ```
4. **Validation & ACK** – `MessageHandler` sanitises content, checks rate-limit, then immediately
   returns `{ status: 'QUEUED', clientMsgId }` so the sender UI can mark the bubble as _pending_.
5. **Queue publish** – The handler calls `MessageQueueService.publishHighPriority()` which places the
   payload on the `chat.events.high` queue with `priority: 9` and a correlation id.
6. **Processor** – A free `EventProcessor` replica consumes the job, stores the record in PostgreSQL
   via `ChatService`, updates read counters in Redis and finally emits `message.delivered` to all
   socket ids inside `room:members:<roomId>` using `WebSocketEventService`.
7. **Client update** – Sender receives the delivered event, matches by `clientMsgId` and flips the UI
   state from _pending_ → _sent_. Recipients render the new bubble in real-time.

#### 🔐 Security & resilience

- **HMAC signature** on every payload prevents tampering between gateway and workers.
- **Retry policy** – 3 exponential back-offs (1s / 5s / 25s) before routing to the DLQ.
- **Idempotency** enforced by a `unique(jobId)` constraint in PostgreSQL and a Lua script in Redis to
  discard duplicates when a processor crashes mid-transaction.

### Cache layer (`src/chat/cache.service.ts`)

- Thin wrapper around **Redis** with a prefix `chat:` for namespacing.
- Stores:
  - `socket:<userId> → socketId` – quick lookup for direct emits.
  - `online:users → sorted-set(timestamp, userId)` – O(log n) presence queries.
  - Graph sets `graph:friends:<uid>` / `graph:groups:<uid>` for instant relationship checks.
  - Room membership `room:members:<roomId>` enabling server-side broadcast w/out DB joins.
- Provides high-level helpers: `getBroadcastTargets`, `addUserToRoom`, `buildUserRelationshipGraph`, etc.
- TTLs & pipelining are used heavily to minimise round-trips.

#### 📊 Key anatomy & expiry strategy

| Key                   | Type                  | TTL           | Purpose                                         |
| --------------------- | --------------------- | ------------- | ----------------------------------------------- |
| `socket:<uid>`        | string                | 1 day sliding | Maps user → active socket id for direct emits   |
| `online:users`        | zset(score=timestamp) | 5 min         | Fast _who is online_ queries & stale eviction   |
| `room:members:<rid>`  | set                   | 30 min        | Enables O(1) room broadcasts without DB hits    |
| `graph:friends:<uid>` | set                   | 12 h          | Pre-calculated friend list for presence fan-out |

A scheduled Redis-only Lua job trims `online:users` and extends TTLs for active sockets every
30 seconds which keeps hot keys in memory while naturally expiring inactive sessions.

#### ⚡ Hot-path helpers

```ts
// Pseudocode
async getBroadcastTargets(roomId) {
  return await redis.smembers(`room:members:${roomId}`)
}

async addUserToRoom(userId, roomId) {
  await redis.sadd(`room:members:${roomId}`, userId)
  await redis.expire(`room:members:${roomId}`, 1800)
}
```

### Message queue & event processing

- **MessageQueueService** (AMQP) defines three priority queues + DLQ.
- Events are published with calculated `priority` + `routingKey`:
  - 10/8 – calls & messages ➜ `chat.events.high`
  - 5 – group ops / deletes ➜ `chat.events.medium`
  - 3/1 – presence / typing ➜ `chat.events.low`
- Each queue is consumed by **EventProcessor** instances (auto-scaled via Docker replicas).
- Processor pipeline:

```
Client → ChatGateway.publish*()
        └──▶ RabbitMQ queue
                 └──▶ EventProcessor
                          ├─ Validate & enrich
                          ├─ ChatService (DB) / CacheManager (Redis)
                          └─ WebSocketEventService.emit()
```

- Retries ×3 then DLQ, metrics forwarded to `PerformanceService`.

#### 🏗️ Topology

```mermaid
flowchart LR
  subgraph "RabbitMQ"
    high["chat.events.high"]
    medium["chat.events.medium"]
    low["chat.events.low"]
    dlq["chat.events.dlq"]
  end
  ChatGateway -- publish --> high & medium & low
  high & medium & low -- consume --> EP["EventProcessor pods"]
  EP -- reject / max-retry --> dlq
```

#### 📶 Back-pressure handling

1. Queue length & consumer utilisation are exported to Prometheus via `@willsoto/nestjs-prometheus`.
2. Kubernetes HPA scales `EventProcessor` pods on `rabbitmq_queue_messages_ready` metric.
3. When _high_ queue exceeds 10 k pending, `ChatGateway` starts shedding _typing_ & _presence_
   packets (low importance) to protect critical call signalling.

---

## 🔧 Environment variables

| Var                  | Default                      | Notes                              |
| -------------------- | ---------------------------- | ---------------------------------- |
| `PORT`               | 8080                         | Backend HTTP port (Nginx upstream) |
| `DATABASE_URL`       | postgres://...               | Prisma connection string           |
| `REDIS_URL`          | redis://:pass@host:6379      | Cache + socket adapter             |
| `RABBITMQ_URL`       | amqp://guest:guest@host:5672 | Message queue                      |
| `JWT_ACCESS_TOKEN`   | _required_                   | JWT secret                         |
| `JWT_ACCESS_EXPIRED` | 7d                           | Access token TTL                   |

Create `.env.local` to override values in development.

---

## 📡 API documentation

Swagger is exposed at `/api-docs` when `NODE_ENV` != production.

---

## 🏗️ CI / CD

A typical pipeline should:

1. Run `npm ci` + `npm run lint` + tests.
2. Build Docker image via `docker build -t realtime-server .`.
3. Push image and deploy (Compose / Kubernetes).

---

1. Clean Architecture For Chat Module Directory Structure
   src/chat/
   ├── domain/ # Core business rules
   │ ├── entities/ # Business entities
   │ ├── repositories/ # Repository interfaces
   │ └── services/ # Domain services
   │
   ├── application/ # Use cases
   │ ├── commands/ # Command handlers
   │ ├── queries/ # Query handlers
   │ └── dtos/ # DTOs
   │
   ├── infrastructure/ # External systems adapters
   │ ├── persistence/ # Database adapters
   │ ├── cache/ # Cache implementation
   │ ├── messaging/ # Message queue
   │ ├── websocket/ # WebSocket implementation
   │ └── security/ # Security services
   │
   └── interfaces/ # User-facing interfaces
   ├── http/ # HTTP controllers
   ├── websocket/ # WebSocket gateway
   └── dtos/ # Interface DTOs

---

## 🤝 Contributing

1. Fork & PR.
2. Follow conventional commits and run `npm run lint` before pushing.
3. Ensure new modules are registered in `app.module.ts` and env vars are documented.

---

## 📄 License

UNLICENSED – proprietary internal project.