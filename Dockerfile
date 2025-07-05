# ==============================================================================
# Multi-stage Dockerfile for NestJS Realtime Server
# ==============================================================================

# ----------- Base Stage -----------
FROM node:22-alpine AS base

# Install security updates and required tools
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    openssl \
    ca-certificates \
    wget \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./
COPY prisma ./prisma/

# ----------- Dependencies Stage -----------
FROM base AS deps

# Install all dependencies
RUN npm ci --frozen-lockfile && \
    npm cache clean --force

# ----------- Builder Stage -----------
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set Prisma engine type for Alpine
ENV PRISMA_CLIENT_ENGINE_TYPE="binary"

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build && \
    npm prune --production

# ----------- Development Stage -----------
FROM base AS development

# Install development dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set Prisma engine type for Alpine
ENV PRISMA_CLIENT_ENGINE_TYPE="binary"

# Generate Prisma client
RUN npx prisma generate

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 8080

# Development command
CMD ["npm", "run", "start:dev"]

# ----------- Production Stage -----------
FROM base AS production

# Set environment to production
ENV NODE_ENV=production \
    PORT=8080 \
    PRISMA_CLIENT_ENGINE_TYPE=binary

# Create app directory and set ownership
RUN mkdir -p /app && chown -R nestjs:nodejs /app

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Copy public assets if they exist
COPY --from=builder --chown=nestjs:nodejs /app/public ./public

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]

