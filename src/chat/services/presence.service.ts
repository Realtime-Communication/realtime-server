import { Injectable, Logger } from '@nestjs/common';
import { CacheManager } from '../cache.service';
import { RoomUtil } from '../utils/room.util';
import { Server } from 'socket.io';

export interface UserPresence {
  userId: number;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  socketId?: string;
  activity?: string;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private userPresences = new Map<number, UserPresence>();

  constructor(private readonly cacheManager: CacheManager) {}

  /**
   * Set user online
   */
  async setUserOnline(
    userId: number,
    socketId: string,
    activity = 'online'
  ): Promise<void> {
    const presence: UserPresence = {
      userId,
      status: 'online',
      lastSeen: new Date(),
      socketId,
      activity,
    };

    this.userPresences.set(userId, presence);
    await this.cacheManager.setUserOnline(userId);

    this.logger.debug(`User ${userId} is now online`);
  }

  /**
   * Set user offline
   */
  async setUserOffline(userId: number): Promise<void> {
    const presence = this.userPresences.get(userId);
    if (presence) {
      presence.status = 'offline';
      presence.lastSeen = new Date();
      presence.socketId = undefined;
      this.userPresences.set(userId, presence);
    }

    await this.cacheManager.removeUserData(userId);
    this.logger.debug(`User ${userId} is now offline`);
  }

  /**
   * Update user status
   */
  async updateUserStatus(
    userId: number,
    status: 'online' | 'away' | 'busy',
    activity?: string
  ): Promise<void> {
    const presence = this.userPresences.get(userId);
    if (presence) {
      presence.status = status;
      presence.lastSeen = new Date();
      if (activity) {
        presence.activity = activity;
      }
      this.userPresences.set(userId, presence);
    }

    this.logger.debug(`User ${userId} status updated to ${status}`);
  }

  /**
   * Get user presence
   */
  getUserPresence(userId: number): UserPresence | null {
    return this.userPresences.get(userId) || null;
  }

  /**
   * Get multiple user presences
   */
  getUserPresences(userIds: number[]): UserPresence[] {
    return userIds
      .map(id => this.userPresences.get(id))
      .filter((presence): presence is UserPresence => presence !== undefined);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): UserPresence[] {
    return Array.from(this.userPresences.values()).filter(
      presence => presence.status === 'online'
    );
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: number): boolean {
    const presence = this.userPresences.get(userId);
    return presence?.status === 'online' || false;
  }

  /**
   * Broadcast presence update to friends
   */
  async broadcastPresenceUpdate(
    server: Server,
    userId: number,
    friendIds: number[]
  ): Promise<void> {
    const presence = this.getUserPresence(userId);
    if (!presence) return;

    const presenceData = {
      userId,
      status: presence.status,
      lastSeen: presence.lastSeen,
      activity: presence.activity,
    };

    // Notify each friend
    for (const friendId of friendIds) {
      const friendSocketId = await this.cacheManager.getUserSocket(friendId);
      if (friendSocketId) {
        server.to(friendSocketId).emit('presenceUpdate', presenceData);
      }
    }
  }

  /**
   * Clean up stale presences
   */
  cleanupStalePresences(maxIdleTime = 5 * 60 * 1000): void {
    const now = new Date();
    const staleUserIds: number[] = [];

    for (const [userId, presence] of this.userPresences.entries()) {
      const timeDiff = now.getTime() - presence.lastSeen.getTime();
      
      if (timeDiff > maxIdleTime && presence.status !== 'offline') {
        presence.status = 'offline';
        presence.socketId = undefined;
        staleUserIds.push(userId);
      }
    }

    if (staleUserIds.length > 0) {
      this.logger.debug(`Cleaned up ${staleUserIds.length} stale presences`);
    }
  }

  /**
   * Get presence statistics
   */
  getPresenceStats(): {
    totalUsers: number;
    onlineUsers: number;
    awayUsers: number;
    busyUsers: number;
    offlineUsers: number;
  } {
    const presences = Array.from(this.userPresences.values());
    
    return {
      totalUsers: presences.length,
      onlineUsers: presences.filter(p => p.status === 'online').length,
      awayUsers: presences.filter(p => p.status === 'away').length,
      busyUsers: presences.filter(p => p.status === 'busy').length,
      offlineUsers: presences.filter(p => p.status === 'offline').length,
    };
  }
} 
