import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../guards/ws-jwt.guard';
import { BaseEventHandlerImpl } from './base-event.handler';
import { ChatService } from '../chat.service';
import { RoomUtil } from '../utils/room.util';

@Injectable()
export class ConnectionHandler extends BaseEventHandlerImpl {
  constructor(
    private readonly chatService: ChatService,
    server: Server
  ) {
    super('ConnectionHandler', server);
  }

  async handle(client: AuthenticatedSocket, data: any): Promise<void> {
    // This is used for general connection handling
    // Specific methods below handle connect/disconnect
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      {},
      async () => {
        const userId = client.account.id;
        
        // Set user online
        await this.chatService.setUserOnline(userId, client.id);
        
        // Join user's rooms
        const rooms = await this.chatService.getUserRooms(userId);
        rooms.forEach(room => client.join(room));
        
        // Join user's personal room
        client.join(RoomUtil.getUserRoomName(userId));
        
        // Join online users room
        client.join(RoomUtil.getOnlineUsersRoom());
        
        // Notify others that user is online
        await this.notifyUserOnline(userId);
        
        this.logEvent('connection', userId, `joined ${rooms.length} rooms`);
      }
    );
  }

  async handleDisconnection(client: AuthenticatedSocket): Promise<void> {
    if (!client.account) return;

    await this.handleWithErrorCatch(
      client,
      {},
      async () => {
        const userId = client.account.id;
        
        // Set user offline
        await this.chatService.setUserOffline(userId);
        
        // Notify others that user is offline
        await this.notifyUserOffline(userId);
        
        this.logEvent('disconnection', userId);
      }
    );
  }

  async handleGetOnlineUsers(client: AuthenticatedSocket): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      {},
      async () => {
        const onlineUsers = await this.chatService.getOnlineUsers();
        client.emit('onlineUsers', { users: onlineUsers });
      },
      'getOnlineUsersError'
    );
  }

  async handleJoinGroup(client: AuthenticatedSocket, data: { groupId: number }): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      data,
      async () => {
        const groupRoom = RoomUtil.getGroupRoomName(data.groupId);
        
        // Join the group room
        client.join(groupRoom);
        
        // Notify successful join
        client.emit('joinedGroup', { 
          groupId: data.groupId, 
          roomName: groupRoom 
        });

        // Notify other group members
        await this.broadcastToRooms('userJoinedGroup', {
          userId: client.account.id,
          groupId: data.groupId,
          timestamp: new Date(),
        }, {
          targetRooms: [groupRoom],
          excludeClient: client.id
        });

        this.logEvent('joinGroup', client.account.id, `group ${data.groupId}`);
      },
      'joinGroupError'
    );
  }

  handlePing(client: AuthenticatedSocket): void {
    client.emit('pong', { timestamp: new Date() });
  }

  private async notifyUserOnline(userId: number): Promise<void> {
    const onlineUsers = await this.chatService.getOnlineUsers();
    
    await this.broadcastToRooms('userOnline', {
      userId,
      onlineUsers,
    }, {
      targetRooms: [RoomUtil.getOnlineUsersRoom()]
    });
  }

  private async notifyUserOffline(userId: number): Promise<void> {
    const onlineUsers = await this.chatService.getOnlineUsers();
    
    await this.broadcastToRooms('userOffline', {
      userId,
      onlineUsers,
    }, {
      targetRooms: [RoomUtil.getOnlineUsersRoom()]
    });
  }
} 
