export interface UserRelationshipGraph {
  userId: number;
  friends: number[];
  groups: number[];
  lastUpdated: Date;
}

export interface RoomMembership {
  roomId: string;
  userIds: number[];
  roomType: 'friend' | 'group';
  lastActivity: Date;
}

export interface CacheRepository {
  // Socket management
  addUserSocket(userId: number, socketId: string): Promise<void>;
  getUserSocket(userId: number): Promise<string | null>;
  
  // Online status
  setUserOnline(userId: number): Promise<void>;
  setUserOffline(userId: number): Promise<void>;
  isUserOnline(userId: number): Promise<boolean>;
  getOnlineUsers(): Promise<number[]>;
  
  // Relationship graph
  buildUserRelationshipGraph(userId: number, friendIds: number[], groupIds: number[]): Promise<void>;
  getUserRelationshipGraph(userId: number): Promise<UserRelationshipGraph | null>;
  getConnectedUsers(userId: number): Promise<number[]>;
  
  // Room management
  addUserToRoom(roomId: string, userId: number, roomType?: 'friend' | 'group'): Promise<void>;
  removeUserFromRoom(roomId: string, userId: number): Promise<void>;
  getRoomMembers(roomId: string): Promise<number[]>;
  getOnlineRoomMembers(roomId: string): Promise<number[]>;
  getUserRooms(userId: number): Promise<string[]>;
  
  // Health check
  ping(): Promise<boolean>;
} 
