import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';
import { CacheManager } from '../cache.service';
import { FriendsService } from 'src/friends/friends.service';
import { WebSocketSecurityService } from '../websocket-security.service';

@Injectable()
export class ConnectionHandler {
  private readonly logger = new Logger(ConnectionHandler.name);
  private server: Server;

  constructor(
    private readonly cacheManager: CacheManager,
    private readonly friendsService: FriendsService,
    private readonly securityService: WebSocketSecurityService
  ) {}

  /**
   * Set the server instance
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Handle new client connection
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const startTime = Date.now();
    const userId = client.account.id;
    const socketId = client.id;
    const clientIp = client.handshake.address;

    try {
      // Security check
      if (!this.securityService.checkIPSecurity(clientIp)) {
        client.disconnect();
        this.logger.warn(`Blocked connection from suspicious IP: ${clientIp}`);
        return;
      }

      // Register user socket
      await this.cacheManager.addUserSocket(userId, socketId);
      await this.cacheManager.setUserOnline(userId);

      // Join default room
      client.join('-1');

      // Setup user rooms
      await this.setupUserRooms(client, userId);

      // Notify about online status
      await this.notifyOnlineStatus(client, userId);

      const duration = Date.now() - startTime;
      this.logger.log(
        `User ${userId} connected successfully (${duration}ms) from ${clientIp}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle connection for user ${userId}: ${error.message}`
      );
      client.emit('connectionError', { message: 'Failed to establish connection' });
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const userId = client.account?.id;
    
    if (!userId) {
      return;
    }

    try {
      // Remove user data from cache
      await this.cacheManager.removeUserData(userId);

      // Notify friends about offline status
      const friendIds = await this.friendsService.getFriendIds(userId);
      for (const friendId of friendIds) {
        const friendSocket = await this.cacheManager.getUserSocket(friendId);
        if (friendSocket) {
          this.server.to(friendSocket).emit('friendOffline', { userId });
        }
      }

      // Update online users list
      const onlineUsers = await this.cacheManager.getOnlineUsers();
      this.server.emit('listOnline', { listOnline: onlineUsers });

      this.logger.log(
        `User ${userId} disconnected. Online users: ${onlineUsers.length}`
      );
    } catch (error) {
      this.logger.error(
        `Error handling disconnect for user ${userId}: ${error.message}`
      );
    }
  }

  /**
   * Setup user rooms (friends and groups)
   */
  private async setupUserRooms(
    client: AuthenticatedSocket,
    userId: number
  ): Promise<void> {
    // Get user's friends and groups
    const [friendIds, groupIds] = await Promise.all([
      this.friendsService.getFriendIds(userId),
      this.friendsService.getGroupIds(userId)
    ]);

    // Join friend rooms for online friends
    const onlineFriendIds: number[] = [];
    
    for (const friendId of friendIds) {
      const isOnline = await this.cacheManager.isUserOnline(friendId);
      
      if (isOnline) {
        onlineFriendIds.push(friendId);

        // Store bidirectional friend edges
        await Promise.all([
          this.cacheManager.addFriendEdge(userId, friendId),
          this.cacheManager.addFriendEdge(friendId, userId)
        ]);

        // Join friend room
        const roomName = this.getFriendRoomName(userId, friendId);
        client.join(roomName);

        // Make friend join the same room if they're online
        const friendSocket = await this.cacheManager.getUserSocket(friendId);
        if (friendSocket) {
          this.server.sockets.sockets.get(friendSocket)?.join(roomName);
        }
      }
    }

    // Join all group rooms
    for (const groupId of groupIds) {
      client.join(`group:${groupId}`);
    }

    // Store online friends for quick access
    client.data.onlineFriends = onlineFriendIds;
  }

  /**
   * Notify about online status
   */
  private async notifyOnlineStatus(
    client: AuthenticatedSocket,
    userId: number
  ): Promise<void> {
    const onlineFriends = client.data.onlineFriends || [];

    // Notify client of their online friends
    client.emit('onlineFriends', { friends: onlineFriends });

    // Notify online friends about this user coming online
    for (const friendId of onlineFriends) {
      const friendSocket = await this.cacheManager.getUserSocket(friendId);
      if (friendSocket) {
        this.server.to(friendSocket).emit('friendOnline', { userId });
      }
    }

    // Broadcast updated online users list
    const allOnlineUsers = await this.cacheManager.getOnlineUsers();
    this.server.emit('listOnline', { listOnline: allOnlineUsers });
  }

  /**
   * Handle join group request
   */
  async handleJoinGroup(
    client: AuthenticatedSocket,
    groupId: number
  ): Promise<void> {
    try {
      // Verify user has access to the group
      const hasAccess = await this.friendsService.isUserInGroup(
        client.account.id,
        groupId
      );

      if (!hasAccess) {
        client.emit('joinGroupError', { 
          message: 'You do not have access to this group' 
        });
        return;
      }

      // Join the group room
      const roomName = `group:${groupId}`;
      client.join(roomName);

      // Notify client of successful join
      client.emit('joinedGroup', { groupId, roomName });

      this.logger.log(`User ${client.account.id} joined group ${groupId}`);
    } catch (error) {
      this.logger.error(
        `Error joining group ${groupId} for user ${client.account.id}: ${error.message}`
      );
      client.emit('joinGroupError', { message: 'Failed to join group' });
    }
  }

  /**
   * Get friend room name with consistent ordering
   */
  private getFriendRoomName(userId1: number, userId2: number): string {
    const minId = Math.min(userId1, userId2);
    const maxId = Math.max(userId1, userId2);
    return `friend:${minId}:${maxId}`;
  }
} 
