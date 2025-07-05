# ==============================================================================
# Makefile for NestJS Realtime Server Docker Setup
# ==============================================================================

.PHONY: help setup build up down logs restart clean backup restore test

# Default target
help: ## Show this help message
	@echo "NestJS Realtime Server - Docker Management"
	@echo "=========================================="
	@echo ""
	@echo "Available commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Environment setup
setup: ## Set up environment from template
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "Environment file created from template"; \
		echo "Please edit .env with your configuration"; \
	else \
		echo "Environment file already exists"; \
	fi

# Production commands
build: ## Build all Docker images
	docker-compose build

up: ## Start all services in production mode
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## View logs from all services
	docker-compose logs -f

restart: ## Restart all services
	docker-compose restart

ps: ## Show running containers
	docker-compose ps

# Development commands
dev-up: ## Start development environment
	docker-compose -f docker-compose.dev.yml up -d

dev-down: ## Stop development environment
	docker-compose -f docker-compose.dev.yml down

dev-logs: ## View development logs
	docker-compose -f docker-compose.dev.yml logs -f

dev-restart: ## Restart development environment
	docker-compose -f docker-compose.dev.yml restart

dev-seed: ## Start development environment with database seeding
	docker-compose -f docker-compose.dev.yml --profile seed up -d

# Database commands
db-migrate: ## Run database migrations
	docker-compose exec app npx prisma migrate deploy

db-reset: ## Reset database
	docker-compose exec app npx prisma migrate reset --force

db-generate: ## Generate Prisma client
	docker-compose exec app npx prisma generate

db-seed: ## Seed database with test data
	docker-compose exec app npx prisma db seed

db-studio: ## Open Prisma Studio
	docker-compose exec app npx prisma studio

# Management tools
pgadmin: ## Start only PgAdmin
	docker-compose --profile management up -d pgadmin

redis-commander: ## Start only Redis Commander
	docker-compose --profile management up -d redis-commander

tools: ## Start all management tools
	docker-compose --profile management up -d

# Backup and restore
backup: ## Backup database and Redis
	@echo "Creating backup directory..."
	@mkdir -p backups
	@echo "Backing up PostgreSQL database..."
	docker-compose exec postgres pg_dump -U admin realtime_chat > backups/postgres_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backing up Redis data..."
	docker-compose exec redis redis-cli --rdb /data/backup.rdb
	docker cp $$(docker-compose ps -q redis):/data/backup.rdb backups/redis_$(shell date +%Y%m%d_%H%M%S).rdb
	@echo "Backup completed!"

restore-db: ## Restore database from backup file (usage: make restore-db FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "Please specify backup file: make restore-db FILE=backup.sql"; \
		exit 1; \
	fi
	docker-compose exec -i postgres psql -U admin realtime_chat < $(FILE)

# Health and monitoring
health: ## Check health of all services
	@echo "Checking service health..."
	@docker-compose ps
	@echo ""
	@echo "Testing backend health endpoint..."
	@curl -s http://localhost:8080/health || echo "Backend health check failed"

stats: ## Show resource usage statistics
	docker stats --no-stream

# Cleanup commands
clean: ## Remove all containers and volumes
	docker-compose down -v
	docker system prune -f

clean-all: ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all
	docker system prune -a -f

# Service-specific commands
app-logs: ## View app service logs
	docker-compose logs -f app

app-shell: ## Open shell in app container
	docker-compose exec app sh

db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U admin realtime_chat

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli -a $$(grep REDIS_PASSWORD .env | cut -d '=' -f2)

# Security commands
security-scan: ## Run security scan on images
	@echo "Scanning Docker images for vulnerabilities..."
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy image realtime-server || echo "Trivy not available"

update-images: ## Update all Docker images
	docker-compose pull
	docker-compose build --no-cache

# Testing commands
test: ## Run application tests
	docker-compose exec app npm test

test-e2e: ## Run end-to-end tests
	docker-compose exec app npm run test:e2e

test-coverage: ## Run tests with coverage
	docker-compose exec app npm run test:cov

# Utility commands
generate-secrets: ## Generate secure secrets for environment
	@echo "Generate these secrets for your .env file:"
	@echo "POSTGRES_PASSWORD=$$(openssl rand -base64 32)"
	@echo "REDIS_PASSWORD=$$(openssl rand -base64 32)"
	@echo "RABBITMQ_PASSWORD=$$(openssl rand -base64 32)"
	@echo "JWT_ACCESS_TOKEN=$$(openssl rand -base64 48)"
	@echo "JWT_REFRESH_TOKEN=$$(openssl rand -base64 48)"
	@echo "SESSION_SECRET=$$(openssl rand -base64 48)"
	@echo "PGADMIN_PASSWORD=$$(openssl rand -base64 32)"
	@echo "REDIS_COMMANDER_PASSWORD=$$(openssl rand -base64 32)"

init: setup generate-secrets ## Initialize project with setup and secrets

# Quick deployment commands
deploy: setup build up db-migrate ## Full deployment (setup, build, start, migrate)

redeploy: down build up db-migrate ## Redeploy with rebuild

# Monitoring commands
monitor: ## Monitor all services (requires ctop)
	@which ctop > /dev/null || (echo "Please install ctop: https://github.com/bcicen/ctop" && exit 1)
	ctop

# SSL/TLS commands
ssl-cert: ## Generate self-signed SSL certificate
	@mkdir -p ssl
	@openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout ssl/key.pem -out ssl/cert.pem \
		-subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
	@echo "SSL certificate generated in ssl/ directory"

# Development helpers
dev-reset: ## Reset development environment
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.dev.yml up -d
	docker-compose -f docker-compose.dev.yml exec app npx prisma migrate reset --force
	docker-compose -f docker-compose.dev.yml exec app npx prisma db seed

# Performance testing
load-test: ## Run basic load test (requires ab)
	@which ab > /dev/null || (echo "Please install Apache Bench (ab)" && exit 1)
	ab -n 1000 -c 10 http://localhost:8080/health 
