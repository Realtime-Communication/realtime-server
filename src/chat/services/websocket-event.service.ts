import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';
import { RoomUtil } from '../utils/room.util';
import { ConversationType } from 'src/groups/model/conversation.vm';

export interface EventData {
  event: string;
  data: any;
  userId?: number;
  conversationId?: number;
  conversationType?: ConversationType;
  timestamp: Date;
}

@Injectable()
export class WebSocketEventService {
  private readonly logger = new Logger(WebSocketEventService.name);
  private server: Server;

  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Emit event to specific user
   */
  async emitToUser(userId: number, event: string, data: any): Promise<boolean> {
    try {
      // Get user's socket from cache or active connections
      const userSockets = await this.findUserSockets(userId);
      
      if (userSockets.length === 0) {
        this.logger.debug(`User ${userId} not found for event ${event}`);
        return false;
      }

      // Emit to all user's sockets (multiple devices)
      for (const socketId of userSockets) {
        this.server.to(socketId).emit(event, {
          ...data,
          timestamp: new Date(),
        });
      }

      this.logger.debug(`Event ${event} sent to user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to emit to user ${userId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Emit event to conversation participants
   */
  async emitToConversation(
    conversationId: number,
    conversationType: ConversationType,
    event: string,
    data: any,
    excludeUserId?: number
  ): Promise<void> {
    try {
      const roomNames = RoomUtil.getTargetRooms(
        conversationType,
        conversationId,
        excludeUserId || 0
      );

      let emitter = this.server.to(roomNames);
      
      // Exclude specific user if provided
      if (excludeUserId) {
        const userSockets = await this.findUserSockets(excludeUserId);
        if (userSockets.length > 0) {
          emitter = emitter.except(userSockets);
        }
      }

      emitter.emit(event, {
        ...data,
        conversationId,
        conversationType,
        timestamp: new Date(),
      });

      this.logger.debug(`Event ${event} sent to conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit to conversation ${conversationId}: ${error.message}`
      );
    }
  }

  /**
   * Emit event to multiple users
   */
  async emitToUsers(
    userIds: number[],
    event: string,
    data: any
  ): Promise<number> {
    let successCount = 0;

    for (const userId of userIds) {
      const success = await this.emitToUser(userId, event, data);
      if (success) successCount++;
    }

    this.logger.debug(
      `Event ${event} sent to ${successCount}/${userIds.length} users`
    );
    return successCount;
  }

  /**
   * Broadcast event to all connected users
   */
  async broadcastToAll(event: string, data: any): Promise<void> {
    try {
      this.server.emit(event, {
        ...data,
        timestamp: new Date(),
      });

      this.logger.debug(`Event ${event} broadcasted to all users`);
    } catch (error) {
      this.logger.error(`Failed to broadcast event ${event}: ${error.message}`);
    }
  }

  /**
   * Emit typing indicator
   */
  async emitTyping(
    client: AuthenticatedSocket,
    conversationId: number,
    conversationType: ConversationType,
    isTyping: boolean
  ): Promise<void> {
    const roomNames = RoomUtil.getTargetRooms(
      conversationType,
      conversationId,
      client.account.id
    );

    this.server
      .to(roomNames)
      .except(client.id)
      .emit('typing', {
        userId: client.account.id,
        userFirstName: client.account.firstName,
        userLastName: client.account.lastName,
        conversationId,
        isTyping,
        timestamp: new Date(),
      });
  }

  /**
   * Emit presence update
   */
  async emitPresenceUpdate(
    userId: number,
    status: string,
    friendIds: number[]
  ): Promise<void> {
    await this.emitToUsers(friendIds, 'presenceUpdate', {
      userId,
      status,
      timestamp: new Date(),
    });
  }

  /**
   * Emit notification
   */
  async emitNotification(
    userId: number,
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      data?: any;
    }
  ): Promise<boolean> {
    return this.emitToUser(userId, 'notification', notification);
  }

  /**
   * Emit error to specific client
   */
  emitError(
    client: AuthenticatedSocket,
    event: string,
    error: string | Error
  ): void {
    const message = typeof error === 'string' ? error : error.message;
    
    client.emit(`${event}Error`, {
      message,
      timestamp: new Date(),
      userId: client.account?.id,
    });

    this.logger.warn(
      `Error emitted to user ${client.account?.id} for event ${event}: ${message}`
    );
  }

  /**
   * Log event for analytics/debugging
   */
  logEvent(eventData: EventData): void {
    this.logger.debug('WebSocket Event:', {
      event: eventData.event,
      userId: eventData.userId,
      conversationId: eventData.conversationId,
      timestamp: eventData.timestamp,
    });
  }

  /**
   * Find all socket IDs for a user
   */
  private async findUserSockets(userId: number): Promise<string[]> {
    const sockets: string[] = [];
    
    // Check all connected sockets for this user
    for (const [socketId, socket] of this.server.sockets.sockets) {
      const authSocket = socket as AuthenticatedSocket;
      if (authSocket.account?.id === userId) {
        sockets.push(socketId);
      }
    }

    return sockets;
  }

  /**
   * Get server statistics
   */
  getServerStats(): {
    connectedSockets: number;
    rooms: number;
    events: string[];
  } {
    return {
      connectedSockets: this.server.sockets.sockets.size,
      rooms: this.server.sockets.adapter.rooms.size,
      events: this.server.eventNames() as string[],
    };
  }
} 
