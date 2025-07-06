import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../guards/ws-jwt.guard';
import { BaseEventHandlerImpl } from './base-event.handler';
import { ChatService } from '../chat.service';
import { CallDto } from '../dto';
import { RoomUtil } from '../utils/room.util';
import { CallStatus } from '@prisma/client';

@Injectable()
export class CallHandler extends BaseEventHandlerImpl {
  constructor(
    private readonly chatService: ChatService,
    server: Server
  ) {
    super('CallHandler', server);
  }

  async handle(client: AuthenticatedSocket, data: any): Promise<void> {
    // General call handling - can be extended for middleware
  }

  async handleCallUser(client: AuthenticatedSocket, callDto: CallDto): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      callDto,
      async () => {
        // Create call record
        const callMessage = await this.chatService.handleCall(client.account, callDto);
        
        // Get target rooms
        const targetRooms = RoomUtil.getTargetRooms(
          callDto.conversationType,
          callDto.conversationId,
          client.account.id
        );

        // Check if anyone is online in the conversation
        const hasOnlineUsers = await this.checkOnlineUsers(targetRooms, client.id);

        if (!hasOnlineUsers) {
          client.emit('userNotOnline', {
            message: 'The user you are trying to call is not online'
          });
          return;
        }

        // Broadcast call invitation
        const callData = {
          ...callDto,
          callerInfo: {
            id: client.account.id,
            firstName: client.account.firstName,
            lastName: client.account.lastName,
          },
          timestamp: new Date(),
        };

        await this.broadcastToRooms('callUser', callData, {
          targetRooms,
          excludeClient: client.id
        });

        await this.broadcastToRooms('openCall', callData, {
          targetRooms,
          excludeClient: client.id
        });

        this.logEvent('callUser', client.account.id, `conversation ${callDto.conversationId}`);
      },
      'callUserError'
    );
  }

  async handleAnswerCall(client: AuthenticatedSocket, callDto: CallDto): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      callDto,
      async () => {
        // Update call status
        await this.chatService.handleCallResponse(client.account, callDto, CallStatus.ONGOING);
        
        // Get target rooms
        const targetRooms = RoomUtil.getTargetRooms(
          callDto.conversationType,
          callDto.conversationId,
          client.account.id
        );

        // Notify call accepted
        const responseData = {
          ...callDto,
          answeredBy: {
            id: client.account.id,
            firstName: client.account.firstName,
            lastName: client.account.lastName,
          },
          timestamp: new Date(),
        };

        await this.broadcastToRooms('callAccepted', responseData, {
          targetRooms,
          excludeClient: client.id
        });

        this.logEvent('answerCall', client.account.id, `conversation ${callDto.conversationId}`);
      },
      'answerCallError'
    );
  }

  async handleRefuseCall(client: AuthenticatedSocket, callDto: CallDto): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      callDto,
      async () => {
        // Update call status
        await this.chatService.handleCallResponse(client.account, callDto, CallStatus.ENDED);
        
        // Get target rooms
        const targetRooms = RoomUtil.getTargetRooms(
          callDto.conversationType,
          callDto.conversationId,
          client.account.id
        );

        // Notify call refused
        const responseData = {
          ...callDto,
          refusedBy: {
            id: client.account.id,
            firstName: client.account.firstName,
            lastName: client.account.lastName,
          },
          timestamp: new Date(),
        };

        await this.broadcastToRooms('refuseCall', responseData, {
          targetRooms
        });

        this.logEvent('refuseCall', client.account.id, `conversation ${callDto.conversationId}`);
      }
    );
  }

  async handleCloseCall(client: AuthenticatedSocket, callDto: CallDto): Promise<void> {
    await this.handleWithErrorCatch(
      client,
      callDto,
      async () => {
        // Update call status
        await this.chatService.handleCallResponse(client.account, callDto, CallStatus.ENDED);
        
        // Get target rooms
        const targetRooms = RoomUtil.getTargetRooms(
          callDto.conversationType,
          callDto.conversationId,
          client.account.id
        );

        // Notify call ended
        const closeData = {
          closedBy: client.account.id,
          closedAt: new Date(),
          conversationId: callDto.conversationId,
        };

        await this.broadcastToRooms('closeCall', closeData, {
          targetRooms
        });

        this.logEvent('closeCall', client.account.id, `conversation ${callDto.conversationId}`);
      }
    );
  }

  private async checkOnlineUsers(targetRooms: string[], excludeClientId: string): Promise<boolean> {
    for (const room of targetRooms) {
      const roomSockets = this.server.sockets.adapter.rooms.get(room);
      if (roomSockets && roomSockets.size > 1) { // More than just the caller
        return true;
      }
    }
    return false;
  }
} 
