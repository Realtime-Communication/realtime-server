export const WebSocketConfig = {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'] as const,
  pingTimeout: 10000,
  pingInterval: 5000,
  maxHttpBufferSize: 1e6, // 1MB
  upgradeTimeout: 10000,
  maxListeners: 100,
  throttle: {
    ttl: 60000, // 1 minute
    limit: 10, // 10 requests per minute
  },
  security: {
    maxSuspiciousAttempts: 10,
    blockDuration: 3600000, // 1 hour
    spamPatterns: [
      /(.)\1{10,}/g, // Repeated characters
      /(https?:\/\/[^\s]+){3,}/g, // Multiple URLs
      /FREE|URGENT|CLICK HERE|LIMITED TIME/gi, // Common spam keywords
    ],
  },
}; 
