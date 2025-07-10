import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../guards/ws-jwt.guard';
import { BaseEventHandlerImpl } from './base-event.handler';
import { TypingDto } from '../dto';
import { RoomUtil } from '../utils/room.util';
import { ConversationType } from 'src/groups/model/conversation.vm';

@Injectable()
export class RealtimeEventHandler extends BaseEventHandlerImpl {
  constructor(server: Server) {
    super('RealtimeEventHandler', server);
  }

  async handle(client: AuthenticatedSocket, data: any): Promise<void> {
    // General real-time event handling - can be extended for middleware
  }

  async handleTyping(client: AuthenticatedSocket, typingDto: TypingDto): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      typingDto,
      async () => {
        // Get target rooms
        const targetRooms = RoomUtil.getTargetRooms(
          typingDto.conversationType,
          typingDto.conversationId,
          client.account.id
        );

        // Broadcast typing indicator
        const typingData = {
          user: {
            id: client.account.id,
            firstName: client.account.firstName,
            lastName: client.account.lastName,
          },
          conversationId: typingDto.conversationId,
          conversationType: typingDto.conversationType,
          isTyping: typingDto.isTyping,
          timestamp: new Date(),
        };

        await this.broadcastToRooms('typing', typingData, {
          targetRooms,
          excludeClient: client.id,
          timeout: 3000
        });

        this.logEvent('typing', client.account.id, 
          `conversation ${typingDto.conversationId}, isTyping: ${typingDto.isTyping}`);
      }
    );
  }

  async handleUserPresence(
    client: AuthenticatedSocket, 
    data: { status: 'online' | 'away' | 'busy' | 'offline' }
  ): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      data,
      async () => {
        const presenceData = {
          userId: client.account.id,
          status: data.status,
          timestamp: new Date(),
        };

        // Broadcast to all user's contacts/friends
        await this.broadcastToRooms('userPresenceUpdate', presenceData, {
          targetRooms: [RoomUtil.getOnlineUsersRoom()]
        });

        this.logEvent('userPresence', client.account.id, `status: ${data.status}`);
      }
    );
  }

  async handleSeenStatus(
    client: AuthenticatedSocket,
    data: { conversationId: number; conversationType: ConversationType; lastSeenMessageId?: number }
  ): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      data,
      async () => {
        // Get target rooms
        const targetRooms = RoomUtil.getTargetRooms(
          data.conversationType,
          data.conversationId,
          client.account.id
        );

        // Broadcast seen status
        const seenData = {
          userId: client.account.id,
          conversationId: data.conversationId,
          lastSeenMessageId: data.lastSeenMessageId,
          seenAt: new Date(),
        };

        await this.broadcastToRooms('userSeenUpdate', seenData, {
          targetRooms,
          excludeClient: client.id
        });

        this.logEvent('seenStatus', client.account.id, 
          `conversation ${data.conversationId}, lastMessage: ${data.lastSeenMessageId}`);
      }
    );
  }

  async handleHeartbeat(client: AuthenticatedSocket): Promise<void> {
    // Simple heartbeat to keep connection alive
    client.emit('heartbeat', { 
      timestamp: new Date(),
      userId: client.account.id
    });
  }

  async handleBroadcastEvent(
    client: AuthenticatedSocket,
    data: { 
      event: string; 
      payload: any; 
      conversationId: number; 
      conversationType: ConversationType;
      excludeSelf?: boolean;
    }
  ): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      data,
      async () => {
        // Get target rooms
        const targetRooms = RoomUtil.getTargetRooms(
          data.conversationType,
          data.conversationId,
          client.account.id
        );

        // Add sender information to payload
        const enrichedPayload = {
          ...data.payload,
          sender: {
            id: client.account.id,
            firstName: client.account.firstName,
            lastName: client.account.lastName,
          },
          timestamp: new Date(),
        };

        await this.broadcastToRooms(data.event, enrichedPayload, {
          targetRooms,
          excludeClient: data.excludeSelf ? client.id : undefined
        });

        this.logEvent('broadcastEvent', client.account.id, 
          `event: ${data.event}, conversation: ${data.conversationId}`);
      }
    );
  }
} 
