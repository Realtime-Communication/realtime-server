import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../guards/ws-jwt.guard';
import { 
  BaseEventHandler, 
  EventHandlerResponse, 
  EventContext, 
  BroadcastOptions 
} from '../interfaces/event-handler.interface';
import { SecurityUtil } from '../utils/security.util';

export abstract class BaseEventHandlerImpl implements BaseEventHandler {
  protected readonly logger: Logger;
  protected server: Server;

  constructor(
    protected readonly handlerName: string,
    server: Server
  ) {
    this.logger = new Logger(handlerName);
    this.server = server;
  }

  abstract handle(client: AuthenticatedSocket, data: any): Promise<void>;

  protected createContext(client: AuthenticatedSocket, eventName: string, data: any): EventContext {
    return {
      client,
      eventName,
      data,
      timestamp: new Date()
    };
  }

  protected createSuccessResponse(message?: string, data?: any): EventHandlerResponse {
    return {
      success: true,
      message,
      data
    };
  }

  protected createErrorResponse(error: string, data?: any): EventHandlerResponse {
    return {
      success: false,
      error,
      data
    };
  }

  protected async broadcastToRooms(
    eventName: string, 
    data: any, 
    options: BroadcastOptions
  ): Promise<void> {
    const { targetRooms, excludeClient, timeout = 5000 } = options;
    
    targetRooms.forEach(room => {
      let emitter = this.server.to(room);
      
      if (excludeClient) {
        emitter = emitter.except(excludeClient);
      }
      
      if (timeout) {
        emitter = emitter.timeout(timeout);
      }
      
      emitter.emit(eventName, data);
    });
  }

  protected checkRateLimit(userId: number): boolean {
    return SecurityUtil.checkRateLimit(userId);
  }

  protected async handleWithErrorCatch(
    client: AuthenticatedSocket,
    data: any,
    handler: () => Promise<void>,
    errorEventName?: string
  ): Promise<void> {
    try {
      await handler();
    } catch (error) {
      this.logger.error(`Error in ${this.handlerName}: ${error.message}`);
      
      if (errorEventName) {
        client.emit(errorEventName, { 
          message: error.message || 'An error occurred' 
        });
      }
    }
  }

  protected logEvent(eventName: string, userId: number, additionalInfo?: string): void {
    const info = additionalInfo ? ` - ${additionalInfo}` : '';
    this.logger.debug(`${eventName} by user ${userId}${info}`);
  }
} 
