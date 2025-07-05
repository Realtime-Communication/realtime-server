# ==============================================================================
# Makefile for NestJS Realtime Server Docker Management
# ==============================================================================

.PHONY: help setup build up down logs restart clean backup restore

# Default target
help: ## Show this help message
	@echo "NestJS Realtime Server - Docker Management"
	@echo "=========================================="
	@echo ""
	@echo "Available commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

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

status: ## Show running containers
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

dev-build: ## Build development images
	docker-compose -f docker-compose.dev.yml build

# NestJS specific commands
backend-logs: ## View backend service logs
	docker-compose logs -f nestjs-backend

backend-shell: ## Open shell in backend container
	docker-compose exec nestjs-backend sh

backend-restart: ## Restart only backend service
	docker-compose restart nestjs-backend

# Database commands
db-migrate: ## Run database migrations
	docker-compose exec nestjs-backend npx prisma migrate deploy

db-reset: ## Reset database
	docker-compose exec nestjs-backend npx prisma migrate reset --force

db-generate: ## Generate Prisma client
	docker-compose exec nestjs-backend npx prisma generate

db-seed: ## Seed database with test data
	docker-compose exec nestjs-backend npx prisma db seed

db-studio: ## Open Prisma Studio
	docker-compose exec nestjs-backend npx prisma studio

db-shell: ## Open PostgreSQL shell
	docker-compose exec postgres psql -U admin -d nestjs_chat_db

# Redis commands
redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli -a $$(grep REDIS_PASSWORD .env | cut -d '=' -f2 | tr -d '"')

redis-monitor: ## Monitor Redis commands
	docker-compose exec redis redis-cli -a $$(grep REDIS_PASSWORD .env | cut -d '=' -f2 | tr -d '"') monitor

redis-info: ## Show Redis info
	docker-compose exec redis redis-cli -a $$(grep REDIS_PASSWORD .env | cut -d '=' -f2 | tr -d '"') info

# Backup and restore
backup: ## Backup database and Redis
	@echo "Creating backup directory..."
	@mkdir -p backups
	@echo "Backing up PostgreSQL database..."
	docker-compose exec postgres pg_dump -U admin nestjs_chat_db > backups/postgres_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "Backing up Redis data..."
	docker-compose exec redis redis-cli --rdb /data/backup.rdb
	docker cp $$(docker-compose ps -q redis):/data/backup.rdb backups/redis_$(shell date +%Y%m%d_%H%M%S).rdb
	@echo "Backup completed!"

restore-db: ## Restore database from backup file (usage: make restore-db FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "Please specify backup file: make restore-db FILE=backup.sql"; \
		exit 1; \
	fi
	docker-compose exec -i postgres psql -U admin nestjs_chat_db < $(FILE)

# Health and monitoring
health: ## Check health of all services
	@echo "Checking service health..."
	@docker-compose ps
	@echo ""
	@echo "Testing backend health endpoint..."
	@curl -s http://localhost:8080/health || echo "Backend health check failed"

stats: ## Show resource usage statistics
	docker stats --no-stream

# Testing commands
test: ## Run application tests
	docker-compose exec nestjs-backend npm test

test-watch: ## Run tests in watch mode
	docker-compose exec nestjs-backend npm run test:watch

test-e2e: ## Run end-to-end tests
	docker-compose exec nestjs-backend npm run test:e2e

test-coverage: ## Run tests with coverage
	docker-compose exec nestjs-backend npm run test:cov

# Linting and formatting
lint: ## Run ESLint
	docker-compose exec nestjs-backend npm run lint

lint-fix: ## Run ESLint with auto-fix
	docker-compose exec nestjs-backend npm run lint:fix

format: ## Format code with Prettier
	docker-compose exec nestjs-backend npm run format

# Cleanup commands
clean: ## Remove all containers and volumes
	docker-compose down -v
	docker system prune -f

clean-all: ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all
	docker system prune -a -f

# Security commands
security-scan: ## Run security scan on images
	@echo "Scanning Docker images for vulnerabilities..."
	@docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy image nestjs-realtime-server || echo "Trivy not available"

update-images: ## Update all Docker images
	docker-compose pull
	docker-compose build --no-cache

# Utility commands
generate-secrets: ## Generate secure secrets for environment
	@echo "Generate these secrets for your .env file:"
	@echo "POSTGRES_PASSWORD=$$(openssl rand -base64 32)"
	@echo "REDIS_PASSWORD=$$(openssl rand -base64 32)"
	@echo "RABBITMQ_PASSWORD=$$(openssl rand -base64 32)"
	@echo "JWT_ACCESS_TOKEN=$$(openssl rand -base64 48)"
	@echo "JWT_REFRESH_TOKEN=$$(openssl rand -base64 48)"
	@echo "SESSION_SECRET=$$(openssl rand -base64 48)"

init: setup generate-secrets ## Initialize project with setup and secrets

# Quick deployment commands
deploy: setup build up db-migrate ## Full deployment (setup, build, start, migrate)

redeploy: down build up db-migrate ## Redeploy with rebuild

dev-deploy: setup dev-build dev-up ## Deploy development environment

# Production specific commands
prod-up: ## Start production services
	NODE_ENV=production docker-compose up -d

prod-build: ## Build production images
	NODE_ENV=production docker-compose build

# Monitoring commands
monitor: ## Monitor all services (requires ctop)
	@which ctop > /dev/null || (echo "Please install ctop: https://github.com/bcicen/ctop" && exit 1)
	ctop

# Development utilities
dev-install: ## Install new npm package in development
	docker-compose -f docker-compose.dev.yml exec nestjs-backend npm install $(PACKAGE)

dev-uninstall: ## Uninstall npm package in development
	docker-compose -f docker-compose.dev.yml exec nestjs-backend npm uninstall $(PACKAGE)

# Documentation
docs: ## Show documentation links
	@echo "Documentation and URLs:"
	@echo "- Application: http://localhost:8080"
	@echo "- API Documentation: http://localhost:8080/api-docs"
	@echo "- PgAdmin: http://localhost:5050"
	@echo "- Redis Commander: http://localhost:8087"
	@echo "- RabbitMQ Management: http://localhost:15672"
	@echo "- Mailhog (dev): http://localhost:8025" 
