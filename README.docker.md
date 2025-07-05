# Docker Configuration for NestJS Realtime Server

This document describes the Docker configuration for the NestJS Realtime Server with production-ready settings, security features, and performance optimizations.

## 🏗️ Architecture

The Docker setup includes the following services:

- **App**: NestJS application with TypeScript
- **PostgreSQL**: Primary database with optimized settings
- **Redis**: Caching and session storage
- **RabbitMQ**: Message queue for scalable real-time features
- **Nginx**: Reverse proxy with load balancing and security
- **PgAdmin**: Database management interface (optional)
- **Redis Commander**: Redis management interface (optional)
- **Mailhog**: Email testing (development only)

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available
- 10GB free disk space

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env

# Or use the Makefile
make setup
```

### 2. Production Deployment

```bash
# Build and start all services
docker-compose up -d

# Or use the Makefile
make deploy

# View logs
make logs

# Check service status
make ps
```

### 3. Development Environment

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Or use the Makefile
make dev-up

# With database seeding
make dev-seed
```

## 🔧 Configuration

### Environment Variables

Key environment variables that must be configured:

```env
# Database
POSTGRES_PASSWORD=<secure_password>
DATABASE_URL=postgresql://admin:<password>@postgres:5432/realtime_chat

# Redis
REDIS_PASSWORD=<secure_password>

# RabbitMQ
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=<secure_password>

# JWT
JWT_ACCESS_TOKEN=<secure_32_char_secret>
JWT_REFRESH_TOKEN=<secure_32_char_secret>

# Management Tools
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=<secure_password>
```

### Security Considerations

1. **Change Default Passwords**: Never use default passwords in production
2. **Use Strong Secrets**: JWT tokens should be at least 32 characters
3. **Enable HTTPS**: Configure SSL certificates for production
4. **Network Security**: Use Docker networks for service isolation
5. **Resource Limits**: Set appropriate CPU and memory limits

## 📊 Service Details

### Application Service

- **Port**: 8080
- **Health Check**: `/health`
- **Logs**: `make app-logs`
- **Debug Port**: 9229 (development only)

### PostgreSQL Database

- **Port**: 5432
- **Database**: `realtime_chat`
- **User**: `admin`
- **Extensions**: UUID, pgcrypto, pg_trgm, btree_gin
- **Management**: PgAdmin on port 5050

### Redis Cache

- **Port**: 6379
- **Memory Limit**: 256MB
- **Persistence**: RDB + AOF
- **Management**: Redis Commander on port 8087

### RabbitMQ Message Queue

- **Port**: 5672
- **Management**: 15672
- **Vhost**: `/`
- **Memory Limit**: 256MB

### Nginx Reverse Proxy

- **HTTP Port**: 80
- **HTTPS Port**: 443
- **Features**: Rate limiting, compression, security headers
- **WebSocket Support**: Yes

## 🛠️ Management Commands

### Container Management

```bash
# Start services
make up

# Stop services
make down

# Restart services
make restart

# View logs
make logs

# Check status
make ps
```

### Database Management

```bash
# Run database migrations
make db-migrate

# Reset database
make db-reset

# Generate Prisma client
make db-generate

# Seed database
make db-seed

# Open Prisma Studio
make db-studio
```

### Development Commands

```bash
# Start development environment
make dev-up

# View development logs
make dev-logs

# Reset development environment
make dev-reset

# Open shell in app container
make app-shell
```

### Backup and Restore

```bash
# Backup database and Redis
make backup

# Restore database from backup
make restore-db FILE=backup.sql

# Database shell
make db-shell

# Redis CLI
make redis-cli
```

## 🔍 Monitoring and Debugging

### Health Checks

```bash
# Check all services
make health

# View resource usage
make stats

# Monitor with ctop (if installed)
make monitor
```

### Common Issues

1. **Port Conflicts**: Ensure ports are not in use by other services
2. **Memory Issues**: Increase Docker memory limits if needed
3. **Permission Errors**: Check file permissions for volumes
4. **Network Issues**: Verify Docker network configuration

## 📈 Performance Tuning

### Database Optimization

- Connection pooling: 10 max connections
- Shared buffers: 256MB
- Effective cache size: 1GB
- Query optimization enabled

### Redis Configuration

- Memory policy: allkeys-lru
- Persistence: RDB + AOF
- Connection pooling enabled

### Nginx Optimization

- Worker processes: auto
- Worker connections: 4096
- Gzip compression enabled
- File caching enabled

## 🔐 Security Features

### Network Security

- Isolated Docker networks
- Service-to-service communication only
- No unnecessary port exposure

### Application Security

- Non-root user in containers
- Security headers via Nginx
- Rate limiting on API endpoints
- Input validation and sanitization

### Data Security

- Encrypted database connections
- Secure password storage
- JWT token validation
- Session management

## 📝 Development vs Production

### Development Features

- Hot reloading enabled
- Debug ports exposed
- Relaxed security settings
- Development tools included
- Detailed logging

### Production Features

- Optimized image layers
- Security hardening
- Resource limits
- Health checks
- Monitoring integration

## 🚨 Troubleshooting

### Common Commands

```bash
# Check container logs
make app-logs

# Restart all services
make restart

# Rebuild and restart
make redeploy

# Remove all containers and volumes
make clean

# Clean up unused resources
make clean-all
```

### Utility Commands

```bash
# Generate secure secrets
make generate-secrets

# Create SSL certificates
make ssl-cert

# Run security scan
make security-scan

# Update images
make update-images
```

## 📄 File Structure

```
realtime-server/
├── Dockerfile                 # Multi-stage production Dockerfile
├── docker-compose.yml         # Production configuration
├── docker-compose.dev.yml     # Development configuration
├── Makefile                   # Docker management commands
├── env.example                # Environment variables template
├── docker/                    # Docker configuration files
│   ├── nginx.conf             # Production Nginx config
│   ├── nginx.dev.conf         # Development Nginx config
│   ├── nginx.global.conf      # Global Nginx settings
│   ├── redis.conf             # Redis configuration
│   ├── rabbitmq.conf          # RabbitMQ configuration
│   ├── pgadmin-servers.json   # PgAdmin server config
│   └── init-scripts/          # Database initialization scripts
│       └── 01-init-db.sql
└── README.docker.md           # This file
```

## 🔄 Updates and Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep Docker images updated
2. **Backup Data**: Regular database and Redis backups
3. **Monitor Resources**: Check CPU, memory, and disk usage
4. **Security Updates**: Update base images and packages
5. **Log Rotation**: Manage log file sizes

### Version Updates

```bash
# Update to latest images
make update-images

# Rebuild with latest base images
docker-compose build --no-cache

# Update with zero downtime
docker-compose up -d --no-deps --build app
```

## 🧪 Testing

### Running Tests

```bash
# Run unit tests
make test

# Run end-to-end tests
make test-e2e

# Run tests with coverage
make test-coverage

# Run load tests
make load-test
```

### Development Testing

```bash
# Start development environment
make dev-up

# Run tests in development
docker-compose -f docker-compose.dev.yml exec app npm test

# Debug with logs
make dev-logs
```

## 📞 Support

For issues and support:

1. Check the logs: `make logs`
2. Verify environment variables: `cat .env`
3. Check service health: `make health`
4. Review resource usage: `make stats`
5. Consult application logs: `make app-logs`

## 🔗 Related Documentation

- [Application README](README.md)
- [API Documentation](src/swagger.ts)
- [Database Schema](prisma/schema.prisma)
- [Environment Configuration](env.example)

---

**Note**: This configuration is optimized for production use with security best practices. Always review and customize settings based on your specific requirements and infrastructure. 
