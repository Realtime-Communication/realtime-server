import { createClient } from 'redis';

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST || undefined,
    port: parseInt(process.env.REDIS_PORT)
  }
});

// const redisClient = createClient({
//   password: 'B90Q4ajBv6CNtjVB4drJVXvsGenrnMWz',
//   socket: {
//     host: 'redis-15284.c302.asia-northeast1-1.gce.cloud.redislabs.com',
//     port: 15284
//   }
// });

redisClient.on('disconnect', () => console.log('Redis Client Disconnect'));
redisClient.on('error', err => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('client is connect'));
redisClient.on('reconnecting', () => console.log('client is reconnecting'));
redisClient.on('ready', () => {});

export default redisClient;

export function closeInstance() {
  redisClient.quit()
}