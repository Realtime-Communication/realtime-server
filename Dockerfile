# ==============================================================================
# NestJS Realtime Server Dockerfile
# Multi-stage build for production optimization
# ==============================================================================

# ----------- Base Stage -----------
FROM node:22-alpine AS base

# Install system dependencies and security updates
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files for better Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# ----------- Dependencies Stage -----------
FROM base AS dependencies

# Install all dependencies (including dev dependencies for build)
RUN npm ci --frozen-lockfile && \
    npm cache clean --force

# ----------- Builder Stage -----------
FROM base AS builder

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set Prisma engine type for Alpine Linux
ENV PRISMA_CLIENT_ENGINE_TYPE="binary"

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Install only production dependencies
RUN npm ci --frozen-lockfile --only=production && \
    npm cache clean --force

# ----------- Production Runner Stage -----------
FROM base AS production

# Set environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    PRISMA_CLIENT_ENGINE_TYPE=binary

# Create directories and set ownership
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nestjs:nodejs /app

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Copy public assets and other necessary files
COPY --from=builder --chown=nestjs:nodejs /app/public ./public

# Switch to non-root user
USER nestjs

# Expose the application port
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]

# ----------- Development Stage -----------
FROM base AS development

# Install development dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set development environment
ENV NODE_ENV=development \
    PORT=8080 \
    PRISMA_CLIENT_ENGINE_TYPE=binary

# Generate Prisma client
RUN npx prisma generate

# Expose application and debug ports
EXPOSE 8080 9229

# Start development server with hot reload
CMD ["sh", "-c", "npx prisma generate && npm run start:dev"]

