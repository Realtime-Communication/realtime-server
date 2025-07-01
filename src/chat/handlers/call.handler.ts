import { Injectable } from '@nestjs/common';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';
import { BaseHandler } from './base.handler';
import { CallDto } from '../dto/create-message.dto';
import { ChatService } from '../message.service';
import { CacheManager } from '../cache.service';

@Injectable()
export class CallHandler extends BaseHandler {
  constructor(
    private readonly chatService: ChatService,
    private readonly cacheManager: CacheManager
  ) {
    super();
  }

  /**
   * Initiate a call
   */
  async handleCallUser(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    try {
      // Check if users are online
      const roomName = `group:${callDto.conversationId}`;
      const members = this.server.sockets.adapter.rooms.get(roomName)?.size || 0;

      if (members < 2) {
        client.emit('userNotOnline', {
          message: 'The user you are trying to call is not online'
        });
        return;
      }

      // Set caller information
      callDto.user = client.account;
      callDto.callerInfomation = client.account;

      // Create call record in database
      await this.chatService.handleCall(client.account, callDto);

      // Notify other users
      await this.emitToRooms(client, callDto, 'openCall', callDto, true);
      await this.emitToRooms(client, callDto, 'callUser', callDto, true);

      this.logger.log(
        `User ${client.account.id} initiated call in conversation ${callDto.conversationId}`
      );
    } catch (error) {
      this.emitError(client, 'callUser', error);
    }
  }

  /**
   * Answer a call
   */
  async handleAnswerCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    try {
      callDto.user = client.account;

      // Update call status in database
      await this.chatService.handleCallResponse(client.account, callDto);

      // Notify caller
      await this.emitToRooms(client, callDto, 'callAccepted', callDto, true);

      this.logger.log(
        `User ${client.account.id} answered call in conversation ${callDto.conversationId}`
      );
    } catch (error) {
      this.emitError(client, 'answerCall', error);
    }
  }

  /**
   * Refuse a call
   */
  async handleRefuseCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    try {
      callDto.user = client.account;

      // Update call status
      await this.chatService.handleCallEnd(client.account, callDto);

      // Notify all participants
      await this.emitToRooms(client, callDto, 'refuseCall', callDto);

      this.logger.log(
        `User ${client.account.id} refused call in conversation ${callDto.conversationId}`
      );
    } catch (error) {
      this.emitError(client, 'refuseCall', error);
    }
  }

  /**
   * Give up on a call (caller cancels before answer)
   */
  async handleGiveUpCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    try {
      callDto.user = client.account;

      // Update call status
      await this.chatService.handleCallEnd(client.account, callDto);

      // Notify participants
      await this.emitToRooms(client, callDto, 'giveUpCall', {
        callerId: client.account.id,
        reason: 'Caller cancelled'
      });

      this.logger.log(
        `User ${client.account.id} gave up call in conversation ${callDto.conversationId}`
      );
    } catch (error) {
      this.emitError(client, 'giveUpCall', error);
    }
  }

  /**
   * Close an ongoing call
   */
  async handleCloseCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    try {
      // Update call status
      await this.chatService.handleCallEnd(client.account, callDto);

      // Notify all participants
      await this.emitToRooms(client, callDto, 'closeCall', {
        closedBy: client.account.id,
        closedAt: new Date()
      });

      this.logger.log(
        `User ${client.account.id} closed call in conversation ${callDto.conversationId}`
      );
    } catch (error) {
      this.emitError(client, 'closeCall', error);
    }
  }

  /**
   * Complete call closure confirmation
   */
  async handleCompleteCloseCall(client: AuthenticatedSocket): Promise<void> {
    try {
      client.emit('completeCloseCall', {
        status: 'success',
        timestamp: new Date()
      });
    } catch (error) {
      this.emitError(client, 'completeCloseCall', error);
    }
  }
} 
