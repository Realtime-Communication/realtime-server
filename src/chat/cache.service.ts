import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheManager {
  
  private readonly redis: Redis;
  private readonly keyPrefix: string = 'chat:';

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'redis'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', 'mypassword'),
      keyPrefix: this.keyPrefix,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (err) => {
      console.error('Redis Cache Manager Error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Redis Cache Manager Connected');
    });
  }

  // --- Key Helpers ---
  private getSocketKey(userId: number): string {
    return `socket:${userId}`;
  }

  private getOnlineKey(userId: number): string {
    return `online:${userId}`;
  }

  private getFriendGraphKey(userId: number): string {
    return `friendGraph:${userId}`;
  }

  // --- User Socket Management ---
  async addUserSocket(userId: number, socketId: string): Promise<void> {
    await this.redis.set(this.getSocketKey(userId), socketId);
  }

  async getUserSocket(userId: number): Promise<string | null> {
    return this.redis.get(this.getSocketKey(userId));
  }

  // --- Online Status Management ---
  async setUserOnline(userId: number): Promise<void> {
    await this.redis.set(this.getOnlineKey(userId), '1', 'EX', 24 * 60 * 60); // 24h
  }

  async isUserOnline(userId: number): Promise<boolean> {
    return (await this.redis.get(this.getOnlineKey(userId))) === '1';
  }

  async getOnlineUsers(): Promise<number[]> {
    const keys = await this.redis.keys(`${this.keyPrefix}online:*`);
    return keys.map((key) =>
      Number(key.replace(`${this.keyPrefix}online:`, '')),
    );
  }

  // --- Friendship Graph (Nodes & Edges) ---
  async addFriendEdge(userId: number, friendId: number): Promise<void> {
    await Promise.all([
      this.redis.sadd(this.getFriendGraphKey(userId), friendId.toString()),
      this.redis.sadd(this.getFriendGraphKey(friendId), userId.toString()),
    ]);
  }

  async removeFriendEdge(userId: number, friendId: number): Promise<void> {
    await Promise.all([
      this.redis.srem(this.getFriendGraphKey(userId), friendId.toString()),
      this.redis.srem(this.getFriendGraphKey(friendId), userId.toString()),
    ]);
  }

  async getFriendNodes(userId: number): Promise<number[]> {
    const friends = await this.redis.smembers(this.getFriendGraphKey(userId));
    return friends.map(Number);
  }

  async hasFriendEdge(userId: number, friendId: number): Promise<boolean> {
    const isMember = await this.redis.sismember(
      this.getFriendGraphKey(userId),
      friendId.toString(),
    );
    return isMember === 1;
  }

  async getFullFriendGraph(): Promise<Record<number, number[]>> {
    const keys = await this.redis.keys(`${this.keyPrefix}friendGraph:*`);
    const graph: Record<number, number[]> = {};

    for (const key of keys) {
      const userId = Number(key.replace(`${this.keyPrefix}friendGraph:`, ''));
      const friends = await this.redis.smembers(key);
      graph[userId] = friends.map(Number);
    }

    return graph;
  }

  // --- User Cleanup ---
  async removeUserData(userId: number): Promise<void> {
    const keys = [
      this.getSocketKey(userId),
      this.getOnlineKey(userId),
      this.getFriendGraphKey(userId),
    ];
    await this.redis.del(...keys);
  }

  // --- Cache Stats & Control ---
  async getCacheSize(): Promise<number> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    return keys.length;
  }

  async clearCache(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // --- Health Check ---
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}
