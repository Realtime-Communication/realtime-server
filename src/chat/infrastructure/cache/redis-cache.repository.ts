import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheRepository, UserRelationshipGraph } from '../../domain/repositories/cache.repository';

@Injectable()
export class RedisCacheRepository implements CacheRepository {
  private readonly logger = new Logger(RedisCacheRepository.name);
  private readonly redis: Redis;
  private readonly keyPrefix: string = 'chat:';

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', 'mypassword'),
      keyPrefix: this.keyPrefix,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis Cache Repository Error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis Cache Repository Connected');
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
    return `graph:friends:${userId}`;
  }

  private getGroupGraphKey(userId: number): string {
    return `graph:groups:${userId}`;
  }

  private getRoomMembersKey(roomId: string): string {
    return `room:members:${roomId}`;
  }

  private getUserRoomsKey(userId: number): string {
    return `user:rooms:${userId}`;
  }

  private getRelationshipCacheKey(userId: number): string {
    return `relationships:${userId}`;
  }

  // --- Socket Management ---
  async addUserSocket(userId: number, socketId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Store socket mapping
    pipeline.set(this.getSocketKey(userId), socketId);
    
    // Add to online users with TTL
    pipeline.set(this.getOnlineKey(userId), '1', 'EX', 24 * 60 * 60);
    
    // Store socket metadata
    pipeline.hset(`socket:metadata:${socketId}`, {
      userId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    });

    await pipeline.exec();
    this.logger.debug(`User ${userId} socket ${socketId} registered`);
  }

  async getUserSocket(userId: number): Promise<string | null> {
    return this.redis.get(this.getSocketKey(userId));
  }

  // --- Online Status Management ---
  async setUserOnline(userId: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.set(this.getOnlineKey(userId), '1', 'EX', 24 * 60 * 60);
    pipeline.zadd('online:users', Date.now(), userId);
    pipeline.hset(`user:activity:${userId}`, {
      status: 'online',
      lastSeen: Date.now(),
      activity: 'active',
    });

    await pipeline.exec();
  }

  async setUserOffline(userId: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.del(this.getOnlineKey(userId));
    pipeline.zrem('online:users', userId);
    pipeline.hset(`user:activity:${userId}`, {
      status: 'offline',
      lastSeen: Date.now(),
    });

    await pipeline.exec();
  }

  async isUserOnline(userId: number): Promise<boolean> {
    return (await this.redis.get(this.getOnlineKey(userId))) === '1';
  }

  async getOnlineUsers(): Promise<number[]> {
    // Use sorted set for better performance
    const users = await this.redis.zrange('online:users', 0, -1);
    return users.map(Number);
  }

  // --- Relationship Graph Management ---
  async buildUserRelationshipGraph(userId: number, friendIds: number[], groupIds: number[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Store friends graph
    if (friendIds.length > 0) {
      pipeline.del(this.getFriendGraphKey(userId));
      pipeline.sadd(this.getFriendGraphKey(userId), ...friendIds.map(String));
    }
    
    // Store groups graph
    if (groupIds.length > 0) {
      pipeline.del(this.getGroupGraphKey(userId));
      pipeline.sadd(this.getGroupGraphKey(userId), ...groupIds.map(String));
    }

    // Store cached relationship data with TTL
    const relationshipData: UserRelationshipGraph = {
      userId,
      friends: friendIds,
      groups: groupIds,
      lastUpdated: new Date(),
    };
    
    pipeline.setex(
      this.getRelationshipCacheKey(userId), 
      3600, // 1 hour TTL
      JSON.stringify(relationshipData)
    );

    await pipeline.exec();
    this.logger.debug(`Built relationship graph for user ${userId}: ${friendIds.length} friends, ${groupIds.length} groups`);
  }

  async getUserRelationshipGraph(userId: number): Promise<UserRelationshipGraph | null> {
    const cached = await this.redis.get(this.getRelationshipCacheKey(userId));
    if (cached) {
      return JSON.parse(cached);
    }

    // Build from Redis sets if cache miss
    const [friends, groups] = await Promise.all([
      this.redis.smembers(this.getFriendGraphKey(userId)),
      this.redis.smembers(this.getGroupGraphKey(userId)),
    ]);

    if (friends.length > 0 || groups.length > 0) {
      const graph: UserRelationshipGraph = {
        userId,
        friends: friends.map(Number),
        groups: groups.map(Number),
        lastUpdated: new Date(),
      };

      // Cache it
      await this.redis.setex(
        this.getRelationshipCacheKey(userId),
        3600,
        JSON.stringify(graph)
      );

      return graph;
    }

    return null;
  }

  async getConnectedUsers(userId: number): Promise<number[]> {
    const graph = await this.getUserRelationshipGraph(userId);
    if (!graph) return [];

    // Get all friends who are online
    const onlineFriends = await this.filterOnlineUsers(graph.friends);
    
    // Get users in same groups who are online
    const groupUsers: Set<number> = new Set();
    for (const groupId of graph.groups) {
      const members = await this.getRoomMembers(`group:${groupId}`);
      const onlineMembers = await this.filterOnlineUsers(members);
      onlineMembers.forEach(id => groupUsers.add(id));
    }

    // Combine and deduplicate
    const allConnected = [...new Set([...onlineFriends, ...Array.from(groupUsers)])];
    return allConnected.filter(id => id !== userId);
  }

  private async filterOnlineUsers(userIds: number[]): Promise<number[]> {
    if (userIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    userIds.forEach(id => pipeline.get(this.getOnlineKey(id)));
    
    const results = await pipeline.exec();
    const onlineUsers: number[] = [];
    
    results?.forEach((result, index) => {
      if (result && result[1] === '1') {
        onlineUsers.push(userIds[index]);
      }
    });

    return onlineUsers;
  }

  // --- Room Management ---
  async addUserToRoom(roomId: string, userId: number, roomType: 'friend' | 'group' = 'group'): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Add user to room members
    pipeline.sadd(this.getRoomMembersKey(roomId), userId);
    
    // Add room to user's rooms
    pipeline.sadd(this.getUserRoomsKey(userId), roomId);
    
    // Store room metadata
    pipeline.hset(`room:metadata:${roomId}`, {
      type: roomType,
      lastActivity: Date.now(),
      memberCount: await this.getRoomMemberCount(roomId) + 1,
    });

    await pipeline.exec();
    this.logger.debug(`User ${userId} added to room ${roomId}`);
  }

  async removeUserFromRoom(roomId: string, userId: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.srem(this.getRoomMembersKey(roomId), userId);
    pipeline.srem(this.getUserRoomsKey(userId), roomId);
    
    // Update room metadata
    const memberCount = await this.getRoomMemberCount(roomId);
    if (memberCount > 0) {
      pipeline.hset(`room:metadata:${roomId}`, {
        lastActivity: Date.now(),
        memberCount: memberCount - 1,
      });
    } else {
      // Clean up empty room
      pipeline.del(`room:metadata:${roomId}`);
    }

    await pipeline.exec();
  }

  async getRoomMembers(roomId: string): Promise<number[]> {
    const members = await this.redis.smembers(this.getRoomMembersKey(roomId));
    return members.map(Number);
  }

  async getRoomMemberCount(roomId: string): Promise<number> {
    return this.redis.scard(this.getRoomMembersKey(roomId));
  }

  async getUserRooms(userId: number): Promise<string[]> {
    return this.redis.smembers(this.getUserRoomsKey(userId));
  }

  async getOnlineRoomMembers(roomId: string): Promise<number[]> {
    const allMembers = await this.getRoomMembers(roomId);
    return this.filterOnlineUsers(allMembers);
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
