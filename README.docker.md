# NestJS Realtime Server - Docker Configuration

This document provides comprehensive instructions for running the NestJS Realtime Server using Docker.

## 🏗️ Architecture

The Docker setup includes:

- **NestJS Backend**: TypeScript-based Node.js application
- **PostgreSQL**: Primary database with optimized configuration
- **Redis**: Caching and session storage
- **RabbitMQ**: Message queue for real-time features
- **PgAdmin**: Database management interface (development)
- **Redis Commander**: Redis management interface (development)
- **Mailhog**: Email testing (development)

## 📋 Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher
- At least 2GB RAM available
- 5GB free disk space

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env

# OR use Makefile
make setup
```

### 2. Generate Secure Secrets

```bash
# Generate random secrets
make generate-secrets

# Copy the output to your .env file
```

### 3. Start Services

**Production:**
```bash
# Start all services
make up

# OR using docker-compose directly
docker-compose up -d
```

**Development:**
```bash
# Start development environment
make dev-up

# OR using docker-compose directly
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Initialize Database

```bash
# Run database migrations
make db-migrate

# Seed database with test data (optional)
make db-seed
```

## 🔧 Configuration

### Environment Variables

Edit your `.env` file with the following key variables:

```env
# Database
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgres://admin:your_secure_password@postgres:5432/nestjs_chat_db

# Redis
REDIS_PASSWORD=your_secure_password

# RabbitMQ
RABBITMQ_PASSWORD=your_secure_password

# JWT
JWT_ACCESS_TOKEN=your_32_character_secret_key
JWT_REFRESH_TOKEN=your_32_character_secret_key

# Session
SESSION_SECRET=your_32_character_secret_key
```

### Service Ports

| Service | Production Port | Development Port |
|---------|----------------|------------------|
| NestJS Backend | 8080 | 8080 |
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |
| RabbitMQ | 5672 | 5672 |
| RabbitMQ Management | 15672 | 15672 |
| PgAdmin | - | 5050 |
| Redis Commander | - | 8087 |
| Mailhog | - | 8025 |

## 🛠️ Management Commands

### Basic Operations

```bash
# View all available commands
make help

# Start services
make up

# Stop services
make down

# View logs
make logs

# Restart services
make restart

# Check service status
make status
```

### Development Commands

```bash
# Start development environment
make dev-up

# View development logs
make dev-logs

# Stop development environment
make dev-down

# Build development images
make dev-build
```

### Database Management

```bash
# Run migrations
make db-migrate

# Reset database
make db-reset

# Generate Prisma client
make db-generate

# Seed database
make db-seed

# Open Prisma Studio
make db-studio

# Open PostgreSQL shell
make db-shell
```

### Redis Management

```bash
# Open Redis CLI
make redis-cli

# Monitor Redis commands
make redis-monitor

# Show Redis info
make redis-info
```

### Testing

```bash
# Run tests
make test

# Run tests in watch mode
make test-watch

# Run end-to-end tests
make test-e2e

# Run tests with coverage
make test-coverage
```

### Code Quality

```bash
# Run linting
make lint

# Fix linting issues
make lint-fix

# Format code
make format
```

## 🔍 Monitoring and Debugging

### Health Checks

```bash
# Check service health
make health

# View resource usage
make stats

# Monitor containers (requires ctop)
make monitor
```

### Accessing Services

```bash
# Open backend shell
make backend-shell

# View backend logs
make backend-logs

# Restart only backend
make backend-restart
```

### Development URLs

- **Application**: http://localhost:8080
- **API Documentation**: http://localhost:8080/api-docs
- **PgAdmin**: http://localhost:5050
- **Redis Commander**: http://localhost:8087
- **RabbitMQ Management**: http://localhost:15672
- **Mailhog**: http://localhost:8025

## 💾 Backup and Restore

### Backup

```bash
# Backup database and Redis
make backup

# Manual database backup
docker-compose exec postgres pg_dump -U admin nestjs_chat_db > backup.sql
```

### Restore

```bash
# Restore database from backup
make restore-db FILE=backup.sql

# Manual restore
docker-compose exec -i postgres psql -U admin nestjs_chat_db < backup.sql
```

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :8080
   
   # Kill the process or change port in .env
   ```

2. **Database Connection Failed**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Verify database is running
   docker-compose exec postgres pg_isready
   ```

3. **Redis Connection Failed**
   ```bash
   # Check Redis logs
   docker-compose logs redis
   
   # Test Redis connection
   docker-compose exec redis redis-cli ping
   ```

4. **Backend Won't Start**
   ```bash
   # Check backend logs
   make backend-logs
   
   # Rebuild backend
   docker-compose build nestjs-backend
   ```

### Reset Everything

```bash
# Stop all services and remove volumes
make clean

# Remove all containers, volumes, and images
make clean-all
```

## 🚀 Deployment

### Production Deployment

```bash
# Full production deployment
make deploy

# This runs:
# - Setup environment
# - Build images
# - Start services
# - Run migrations
```

### Development Deployment

```bash
# Development deployment
make dev-deploy

# This runs:
# - Setup environment
# - Build development images
# - Start development services
```

## 📝 Development Workflow

1. **Initial Setup**
   ```bash
   make init
   ```

2. **Start Development**
   ```bash
   make dev-up
   ```

3. **Make Changes**
   - Edit code (hot reload enabled)
   - Changes automatically reflected

4. **Test Changes**
   ```bash
   make test
   ```

5. **Commit Changes**
   ```bash
   make lint
   make format
   git add .
   git commit -m "Your changes"
   ```

## 🔒 Security Considerations

1. **Change Default Passwords**: Never use default passwords in production
2. **Use Strong Secrets**: JWT and session secrets should be cryptographically secure
3. **Environment Variables**: Never commit `.env` files to version control
4. **Network Security**: Use Docker networks for service isolation
5. **Regular Updates**: Keep base images and dependencies updated

## 📊 Performance Optimization

### Database Optimization

- Connection pooling configured
- Optimized PostgreSQL settings
- Proper indexing via Prisma

### Redis Optimization

- Memory limits configured
- Appropriate eviction policy
- Persistence settings optimized

### Application Optimization

- Multi-stage Docker builds
- Minimal production images
- Health checks configured

## 🔄 Updates and Maintenance

### Update Dependencies

```bash
# Update Docker images
make update-images

# Update Node.js packages (in development)
make dev-install PACKAGE=package-name
```

### Regular Maintenance

```bash
# Backup data regularly
make backup

# Monitor resource usage
make stats

# Check for security vulnerabilities
make security-scan
```

## 📋 Checklist for Production

- [ ] Environment variables configured
- [ ] Strong passwords and secrets generated
- [ ] Database backup strategy implemented
- [ ] Monitoring and logging configured
- [ ] Security headers and CORS configured
- [ ] SSL/TLS certificates configured
- [ ] Resource limits set appropriately
- [ ] Health checks working
- [ ] Error handling and logging implemented

## 🆘 Support

If you encounter issues:

1. Check the logs: `make logs`
2. Verify environment variables
3. Ensure all services are healthy: `make health`
4. Check resource usage: `make stats`
5. Consult the troubleshooting section above

For more detailed information, refer to the individual service documentation and Docker Compose files. 
