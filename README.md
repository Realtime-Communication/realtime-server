# ChatChit – Realtime Communication Server

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

### Clean Architecture – Chat Module

```
src/chat/
├── domain/            # Pure business rules (no Nest / DB code)
│   ├── entities/
│   └── repositories/  # Interfaces only
│
├── application/       # Use-cases (CQRS-lite Commands & Queries)
│   ├── commands/
│   ├── queries/
│   └── dtos/
│
├── infrastructure/    # External concerns
│   ├── persistence/   # Prisma adapters
│   ├── cache/         # Redis adapter
│   ├── messaging/     # RabbitMQ adapter
│   └── websocket/     # Config helpers
│
└── interfaces/        # Delivery mechanisms
    ├── http/          # REST controllers
    └── websocket/     # Gateway, handlers, guards
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
