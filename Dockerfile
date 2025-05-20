# Use Node.js 22
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm install

# Copy source code and prisma schema
COPY . .

# Set environment variables for Prisma
ENV DATABASE_URL="postgres://admin:adminpassword@postgres:5432/main_db"
ENV PRISMA_CLIENT_ENGINE_TYPE="binary"

# Generate Prisma Client
RUN npx prisma generate

# Build the application with explicit commands
RUN npm run build || (echo "Build failed" && ls -la && exit 1)

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Install production dependencies only
RUN npm install --only=production

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application with correct path
CMD ["node", "dist/src/main"]

