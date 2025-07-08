import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface UserRelationship {
  userId: number;
  friendIds: number[];
  groupIds: number[];
  lastActivity: Date;
}

interface RoomMapping {
  roomId: string;
  userIds: number[];
  roomType: 'friend' | 'group';
  metadata?: any;
}

@Injectable()
export class CacheManagerService implements OnModuleInit {
  private readonly logger = new Logger(CacheManagerService.name);
  private readonly redis: Redis;
  private readonly TTL = 3600; // 1 hour default TTL

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', 'mypassword'),
      keyPrefix: 'chat:cache:',
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }

  async onModuleInit() {
    await this.connectRedis();
  }

  private async connectRedis(): Promise<void> {
    try {
      await this.redis.ping();
      this.logger.log('Redis cache connection established');
    } catch (error) {
      this.logger.error('Failed to connect to Redis cache:', error);
      throw error;
    }
  }

  // =============== User Relationship Graph Management ===============

  /**
   * Cache user's friend relationships
   */
  async cacheUserFriends(userId: number, friendIds: number[]): Promise<void> {
    const key = `user:${userId}:friends`;
    const pipeline = this.redis.pipeline();
    
    // Store as sorted set with scores as timestamps
    pipeline.del(key);
    if (friendIds.length > 0) {
      const friendsWithScores = friendIds.flatMap(id => [Date.now(), id]);
      pipeline.zadd(key, ...friendsWithScores);
    }
    pipeline.expire(key, this.TTL);
    
    await pipeline.exec();
    this.logger.debug(`Cached ${friendIds.length} friends for user ${userId}`);
  }

  /**
   * Get user's cached friends
   */
  async getUserFriends(userId: number): Promise<number[]> {
    const key = `user:${userId}:friends`;
    const friendIds = await this.redis.zrange(key, 0, -1);
    return friendIds.map(id => parseInt(id));
  }

  /**
   * Cache user's group memberships
   */
  async cacheUserGroups(userId: number, groupIds: number[]): Promise<void> {
    const key = `user:${userId}:groups`;
    const pipeline = this.redis.pipeline();
    
    pipeline.del(key);
    if (groupIds.length > 0) {
      const groupsWithScores = groupIds.flatMap(id => [Date.now(), id]);
      pipeline.zadd(key, ...groupsWithScores);
    }
    pipeline.expire(key, this.TTL);
    
    await pipeline.exec();
    this.logger.debug(`Cached ${groupIds.length} groups for user ${userId}`);
  }

  /**
   * Get user's cached groups
   */
  async getUserGroups(userId: number): Promise<number[]> {
    const key = `user:${userId}:groups`;
    const groupIds = await this.redis.zrange(key, 0, -1);
    return groupIds.map(id => parseInt(id));
  }

  /**
   * Cache complete user relationship data
   */
  async cacheUserRelationships(userId: number, relationships: UserRelationship): Promise<void> {
    const key = `relationships:${userId}`;
    await this.redis.setex(key, this.TTL, JSON.stringify(relationships));
    
    // Also cache individual friend and group mappings
    await this.cacheUserFriends(userId, relationships.friendIds);
    await this.cacheUserGroups(userId, relationships.groupIds);
    
    this.logger.debug(`Cached complete relationships for user ${userId}`);
  }

  /**
   * Get cached user relationships
   */
  async getUserRelationships(userId: number): Promise<UserRelationship | null> {
    const key = `relationships:${userId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // =============== Room Membership Management ===============

  /**
   * Cache room-to-user mappings
   */
  async cacheRoomUsers(roomId: string, userIds: number[], roomType: 'friend' | 'group'): Promise<void> {
    const key = `room:${roomId}:users`;
    const pipeline = this.redis.pipeline();
    
    // Store as sorted set
    pipeline.del(key);
    if (userIds.length > 0) {
      const usersWithScores = userIds.flatMap(id => [Date.now(), id]);
      pipeline.zadd(key, ...usersWithScores);
    }
    
    // Store room metadata
    pipeline.hset(`room:${roomId}:meta`, {
      type: roomType,
      userCount: userIds.length,
      lastUpdated: Date.now()
    });
    
    pipeline.expire(key, this.TTL);
    pipeline.expire(`room:${roomId}:meta`, this.TTL);
    
    await pipeline.exec();
    this.logger.debug(`Cached ${userIds.length} users for room ${roomId}`);
  }

  /**
   * Get users in a room
   */
  async getRoomUsers(roomId: string): Promise<number[]> {
    const key = `room:${roomId}:users`;
    const userIds = await this.redis.zrange(key, 0, -1);
    return userIds.map(id => parseInt(id));
  }

  /**
   * Add user to room
   */
  async addUserToRoom(roomId: string, userId: number): Promise<void> {
    const key = `room:${roomId}:users`;
    await this.redis.zadd(key, Date.now(), userId);
    await this.redis.expire(key, this.TTL);
    
    // Update user count
    await this.redis.hincrby(`room:${roomId}:meta`, 'userCount', 1);
    
    this.logger.debug(`Added user ${userId} to room ${roomId}`);
  }

  /**
   * Remove user from room
   */
  async removeUserFromRoom(roomId: string, userId: number): Promise<void> {
    const key = `room:${roomId}:users`;
    await this.redis.zrem(key, userId);
    
    // Update user count
    await this.redis.hincrby(`room:${roomId}:meta`, 'userCount', -1);
    
    this.logger.debug(`Removed user ${userId} from room ${roomId}`);
  }

  // =============== Online Users Management ===============

  /**
   * Cache online users with presence data
   */
  async setUserOnline(userId: number, socketId: string, metadata?: any): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Add to online users sorted set (score is timestamp)
    pipeline.zadd('online:users', Date.now(), userId);
    
    // Store user's socket mapping
    pipeline.hset(`user:${userId}:socket`, {
      socketId,
      connectedAt: Date.now(),
      ...metadata
    });
    
    // Set expiration
    pipeline.expire(`user:${userId}:socket`, this.TTL);
    
    await pipeline.exec();
    this.logger.debug(`Set user ${userId} online with socket ${socketId}`);
  }

  /**
   * Remove user from online users
   */
  async setUserOffline(userId: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    // Remove from online users
    pipeline.zrem('online:users', userId);
    
    // Remove socket mapping
    pipeline.del(`user:${userId}:socket`);
    
    await pipeline.exec();
    this.logger.debug(`Set user ${userId} offline`);
  }

  /**
   * Get all online users
   */
  async getOnlineUsers(): Promise<number[]> {
    const userIds = await this.redis.zrange('online:users', 0, -1);
    return userIds.map(id => parseInt(id));
  }

  /**
   * Get user's socket ID
   */
  async getUserSocket(userId: number): Promise<string | null> {
    const socketData = await this.redis.hget(`user:${userId}:socket`, 'socketId');
    return socketData || null;
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userId: number): Promise<boolean> {
    const score = await this.redis.zscore('online:users', userId);
    return score !== null;
  }

  // =============== Broadcasting Target Optimization ===============

  /**
   * Get optimized broadcasting targets for a conversation
   */
  async getBroadcastTargets(conversationId: number, conversationType: 'friend' | 'group', currentUserId: number): Promise<{
    onlineUsers: number[];
    socketIds: string[];
    roomNames: string[];
  }> {
    let roomNames: string[];
    let userIds: number[];

    if (conversationType === 'friend') {
      // For friend conversations, get the friend relationship
      const friendIds = await this.getUserFriends(currentUserId);
      userIds = friendIds.filter(id => id !== currentUserId);
      roomNames = [`friend:${Math.min(currentUserId, conversationId)}:${Math.max(currentUserId, conversationId)}`];
    } else {
      // For group conversations, get group members
      const groupRoomName = `group:${conversationId}`;
      userIds = await this.getRoomUsers(groupRoomName);
      roomNames = [groupRoomName];
    }

    // Get online users and their socket IDs
    const onlineUsers: number[] = [];
    const socketIds: string[] = [];

    const pipeline = this.redis.pipeline();
    userIds.forEach(userId => {
      pipeline.zscore('online:users', userId);
      pipeline.hget(`user:${userId}:socket`, 'socketId');
    });

    const results = await pipeline.exec();
    
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const isOnline = results[i * 2]?.[1] !== null;
      const socketId = results[i * 2 + 1]?.[1];
      
      if (isOnline && socketId) {
        onlineUsers.push(userId);
        socketIds.push(socketId as string);
      }
    }

    return {
      onlineUsers,
      socketIds,
      roomNames
    };
  }

  // =============== Performance Monitoring ===============

  /**
   * Get cache performance metrics
   */
  async getCacheStats(): Promise<{
    onlineUsers: number;
    totalRooms: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    const pipeline = this.redis.pipeline();
    
    // Get online users count
    pipeline.zcard('online:users');
    
    // Get total rooms (approximate)
    pipeline.eval(`
      local rooms = redis.call('KEYS', 'chat:cache:room:*:users')
      return #rooms
    `, 0);
    
    // Get memory usage
    pipeline.info('memory');
    
    const results = await pipeline.exec();
    
    const onlineUsers = results[0]?.[1] || 0;
    const totalRooms = results[1]?.[1] || 0;
    const memoryInfo = results[2]?.[1] || '';
    
    // Parse memory usage
    const memoryMatch = (memoryInfo as string).match(/used_memory_human:(.*?)\r\n/);
    const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';
    
    return {
      onlineUsers: Number(onlineUsers),
      totalRooms: Number(totalRooms),
      memoryUsage,
      hitRate: 0.95 // This would need to be calculated based on actual cache hits/misses
    };
  }

  /**
   * Clear expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    const script = `
      local keys = redis.call('KEYS', 'chat:cache:*')
      local deleted = 0
      for i=1,#keys do
        local ttl = redis.call('TTL', keys[i])
        if ttl == -1 then
          redis.call('DEL', keys[i])
          deleted = deleted + 1
        end
      end
      return deleted
    `;
    
    const deletedCount = await this.redis.eval(script, 0);
    this.logger.debug(`Cleaned up ${deletedCount} expired cache entries`);
    return deletedCount as number;
  }

  // =============== Health Check ===============

  /**
   * Redis health check
   */
  async healthCheck(): Promise<{ connected: boolean; latency: number; stats: any }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      const stats = await this.getCacheStats();
      
      return {
        connected: true,
        latency,
        stats
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        connected: false,
        latency: -1,
        stats: null
      };
    }
  }
} 
