# ----------- Development Build Stage -----------
  FROM node:22-alpine AS builder

  # Set working directory
  WORKDIR /app
  
  # Install dependencies
  COPY package*.json ./
  RUN npm install
  
  # Copy all source code and Prisma files
  COPY . .
  ENV PRISMA_CLIENT_ENGINE_TYPE="binary"
  
  # Generate Prisma client based on schema
  RUN npx prisma generate
  
  # Build TypeScript application
  RUN npm run build || (echo "Build failed" && ls -la && exit 1)
  
  # ----------- Production Runtime Stage -----------
  FROM node:22-alpine AS production
  
  WORKDIR /app
  
  # Copy only necessary files from builder
  COPY --from=builder /app/dist ./dist
  COPY --from=builder /app/package*.json ./
  COPY --from=builder /app/node_modules ./
  COPY --from=builder /app/prisma ./prisma
  COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
  
  # Install only production dependencies
  RUN npm install --omit=dev
  
  # Install Prisma CLI for running migrations in production
  RUN npm install -g prisma
  
  # Set environment variables (can also be passed via docker-compose or --env-file)
  ENV RABBITMQ_URL="amqp://guest:guest@rabbitmq:5672"
  
  # Expose the application port
  EXPOSE 8080
  
  # Run migrations and start the app
  CMD prisma migrate deploy && node dist/src/main

