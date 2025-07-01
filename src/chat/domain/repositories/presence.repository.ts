import { UserPresence, PresenceStatus } from '../entities/user-presence.entity';

export interface PresenceRepository {
  setUserOnline(userId: number, socketId: string, activity?: string): Promise<void>;
  setUserOffline(userId: number): Promise<void>;
  updateUserStatus(userId: number, status: PresenceStatus, activity?: string): Promise<void>;
  getUserPresence(userId: number): Promise<UserPresence | null>;
  getUserPresences(userIds: number[]): Promise<UserPresence[]>;
  getOnlineUsers(): Promise<UserPresence[]>;
  isUserOnline(userId: number): Promise<boolean>;
} 
