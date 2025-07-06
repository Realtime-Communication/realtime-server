import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import * as crypto from 'crypto';
import { AuthenticatedSocket } from '../guards/ws-jwt.guard';
import { BaseEventHandlerImpl } from './base-event.handler';
import { ChatService } from '../chat.service';
import { CreateMessageDto, DeleteMessageDto } from '../dto';
import { RoomUtil } from '../utils/room.util';

@Injectable()
export class MessageHandler extends BaseEventHandlerImpl {
  constructor(
    private readonly chatService: ChatService,
    server: Server
  ) {
    super('MessageHandler', server);
  }

  async handle(client: AuthenticatedSocket, data: any): Promise<void> {
    // General message handling - can be extended for middleware
  }

  async handleSendMessage(client: AuthenticatedSocket, messageDto: CreateMessageDto): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      messageDto,
      async () => {
        // Security checks
        if (!this.checkRateLimit(client.account.id)) {
          client.emit('sendMessageError', { message: 'Rate limit exceeded' });
          return;
        }

        // Set message GUID if not provided
        if (!messageDto.guid) {
          messageDto.guid = crypto.randomUUID();
        }

        // Save message
        const savedMessage = await this.chatService.saveMessage(client.account, messageDto);
        
        // Get target rooms
        const targetRooms = RoomUtil.getTargetRooms(
          messageDto.conversationType,
          messageDto.conversationId,
          client.account.id
        );

        // Broadcast to conversation participants
        await this.broadcastToRooms('messageComing', savedMessage, {
          targetRooms
        });

        await this.broadcastToRooms('loadLastMessage', { 
          conversationId: messageDto.conversationId 
        }, {
          targetRooms
        });

        this.logEvent('sendMessage', client.account.id, `conversation ${messageDto.conversationId}`);
      },
      'sendMessageError'
    );
  }

  async handleDeleteMessage(client: AuthenticatedSocket, deleteDto: DeleteMessageDto): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      deleteDto,
      async () => {
        const deletedMessage = await this.chatService.deleteMessage(client.account, deleteDto.messageId);
        
        if (!deletedMessage) {
          client.emit('deleteMessageError', { message: 'Message not found' });
          return;
        }

        // Get target rooms
        const targetRooms = RoomUtil.getTargetRooms(
          deleteDto.conversationType,
          deleteDto.conversationId,
          client.account.id
        );

        // Broadcast deletion
        const deleteData = {
          messageId: deleteDto.messageId,
          deletedBy: {
            id: client.account.id,
            firstName: client.account.firstName,
            lastName: client.account.lastName,
          },
          deletedAt: new Date(),
          conversationId: deleteDto.conversationId,
        };

        await this.broadcastToRooms('messageDeleted', deleteData, {
          targetRooms
        });

        this.logEvent('deleteMessage', client.account.id, `message ${deleteDto.messageId}`);
      },
      'deleteMessageError'
    );
  }

  async handleMessageRead(
    client: AuthenticatedSocket, 
    data: { messageId: number; conversationId: number; conversationType: any }
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

        // Broadcast read receipt
        const readData = {
          messageId: data.messageId,
          readBy: {
            id: client.account.id,
            firstName: client.account.firstName,
            lastName: client.account.lastName,
          },
          readAt: new Date(),
          conversationId: data.conversationId,
        };

        await this.broadcastToRooms('messageRead', readData, {
          targetRooms,
          excludeClient: client.id
        });

        this.logEvent('messageRead', client.account.id, `message ${data.messageId}`);
      }
    );
  }
} 
