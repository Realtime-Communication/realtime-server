export type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';

export class UserPresence {
  userId: number;
  status: PresenceStatus;
  lastSeen: Date;
  socketId?: string;
  activity?: string;

  constructor(userId: number, status: PresenceStatus = 'online') {
    this.userId = userId;
    this.status = status;
    this.lastSeen = new Date();
  }
} 
