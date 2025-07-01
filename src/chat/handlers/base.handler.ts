import { Server } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';
import { ConversationType } from 'src/groups/model/conversation.vm';
import { BaseDto } from '../dto/base.dto';

@Injectable()
export abstract class BaseHandler {
  protected readonly logger: Logger;
  protected server: Server;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Set the server instance
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Get target room(s) for socket communication
   */
  protected getTargetRooms(
    client: AuthenticatedSocket,
    dto: BaseDto
  ): string | string[] {
    if (dto.conversationType === ConversationType.FRIEND) {
      const minId = Math.min(client.account.id, dto.conversationId);
      const maxId = Math.max(client.account.id, dto.conversationId);
      return [`friend:${minId}:${maxId}`, client.id];
    }
    return [`group:${dto.conversationId}`];
  }

  /**
   * Emit error to specific client
   */
  protected emitError(
    client: AuthenticatedSocket,
    event: string,
    error: Error | string
  ): void {
    const message = typeof error === 'string' ? error : error.message;
    this.logger.error(`${event} error for user ${client.account.id}: ${message}`);
    client.emit(`${event}Error`, { message });
  }

  /**
   * Emit to target rooms with error handling
   */
  protected async emitToRooms(
    client: AuthenticatedSocket,
    dto: BaseDto,
    event: string,
    data: any,
    excludeSender = false
  ): Promise<void> {
    try {
      const rooms = this.getTargetRooms(client, dto);
      let emitter = this.server.to(rooms);
      
      if (excludeSender) {
        emitter = emitter.except(client.id);
      }
      
      emitter.emit(event, data);
    } catch (error) {
      this.emitError(client, event, error);
    }
  }
} 
