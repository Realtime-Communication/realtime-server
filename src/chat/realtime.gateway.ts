import {
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from './ws.guard';
import { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import { MessageHandler } from './handlers/message.handler';
import { CallHandler } from './handlers/call.handler';
import { ConnectionHandler } from './handlers/connection.handler';
import { MessageDto, CallDto, DeleteMessageDto } from './dto/create-message.dto';
import { WebSocketSecurityService } from './websocket-security.service';
import { MessageQueueService } from './queue/message-queue.service';
import { EventProcessor } from './processors/event.processor';
import { CacheManager } from './cache.service';
import { ConversationType } from 'src/groups/model/conversation.vm';

@UseGuards(WsJwtGuard)
@UsePipes(new ValidationPipe({ 
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors) => {
    return new WsException(errors);
  }
}))
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 10000,
  pingInterval: 5000,
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly messageHandler: MessageHandler,
    private readonly callHandler: CallHandler,
    private readonly connectionHandler: ConnectionHandler,
    private readonly securityService: WebSocketSecurityService,
    private readonly messageQueueService: MessageQueueService,
    private readonly eventProcessor: EventProcessor,
    private readonly cacheManager: CacheManager,
  ) {}

  /**
   * Gateway initialization
   */
  async afterInit(server: Server): Promise<void> {
    try {
      // Set server instance for handlers and processors
      this.messageHandler.setServer(server);
      this.callHandler.setServer(server);
      this.connectionHandler.setServer(server);
      this.eventProcessor.setServer(server);

      // Configure authentication middleware
      server.use((socket: AuthenticatedSocket, next) => {
        this.authenticateSocket(socket, next);
      });

      // Configure server options
      this.configureServer(server);

      this.logger.log('WebSocket Server initialized with message queue integration');
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket Server:', error);
      throw error;
    }
  }

  /**
   * Handle new connections with optimized graph building
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.connectionHandler.handleConnection(client);
      
      // Build user relationship graph for efficient broadcasting
      await this.buildUserRelationshipGraph(client);
      
      const connectionTime = Date.now() - startTime;
      this.logger.debug(`User ${client.account.id} connected in ${connectionTime}ms`);
    } catch (error) {
      this.logger.error(`Connection error for user ${client.account?.id}: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle disconnections
   */
  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    await this.connectionHandler.handleDisconnect(client);
  }

  // =============== High-Frequency Events (Queued) ===============

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    client: AuthenticatedSocket,
    messageDto: MessageDto
  ): Promise<void> {
    try {
      // Quick validation and queue the event
      const success = await this.messageQueueService.publishMessageEvent(
        client.account.id,
        client.id,
        {
          conversationId: messageDto.conversationId,
          conversationType: messageDto.conversationType,
          content: messageDto.content,
          messageType: messageDto.messageType,
          attachments: messageDto.attachments,
        }
      );

      if (!success) {
        client.emit('sendMessageError', { 
          message: 'Failed to queue message. Please try again.' 
        });
      }

      // Immediate acknowledgment to client
      client.emit('messageQueued', { 
        tempId: messageDto.guid || crypto.randomUUID(),
        timestamp: new Date() 
      });

    } catch (error) {
      this.logger.error(`Error queuing message: ${error.message}`);
      client.emit('sendMessageError', { message: 'Internal server error' });
    }
  }

  @SubscribeMessage('callUser')
  async handleCallUser(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    try {
      // Queue high-priority call event
      const success = await this.messageQueueService.publishCallEvent(
        client.account.id,
        client.id,
        {
          conversationId: callDto.conversationId,
          conversationType: callDto.conversationType,
          callType: callDto.callType,
        }
      );

      if (!success) {
        client.emit('callUserError', { 
          message: 'Failed to initiate call. Please try again.' 
        });
      }

    } catch (error) {
      this.logger.error(`Error queuing call: ${error.message}`);
      client.emit('callUserError', { message: 'Internal server error' });
    }
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    client: AuthenticatedSocket,
    data: { groupId: number }
  ): Promise<void> {
    try {
      // Queue medium-priority group event
      const success = await this.messageQueueService.publishEvent({
        eventType: 'joinGroup',
        userId: client.account.id,
        socketId: client.id,
        data: { groupId: data.groupId },
        timestamp: new Date(),
        priority: 5,
      });

      if (success) {
        // Immediate room join for real-time events
        client.join(`group:${data.groupId}`);
        client.emit('joinedGroup', { groupId: data.groupId });
      } else {
        client.emit('joinGroupError', { message: 'Failed to join group' });
      }

    } catch (error) {
      this.logger.error(`Error joining group: ${error.message}`);
      client.emit('joinGroupError', { message: 'Internal server error' });
    }
  }

  // =============== Low-Frequency Events (Queued) ===============

  @SubscribeMessage('typing')
  async handleTyping(
    client: AuthenticatedSocket,
    messageDto: MessageDto
  ): Promise<void> {
    try {
      // Queue low-priority typing event
      await this.messageQueueService.publishTypingEvent(
        client.account.id,
        client.id,
        {
          conversationId: messageDto.conversationId,
          conversationType: messageDto.conversationType,
          isTyping: true,
        }
      );
    } catch (error) {
      this.logger.error(`Error queuing typing event: ${error.message}`);
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    client: AuthenticatedSocket,
    deleteDto: DeleteMessageDto
  ): Promise<void> {
    try {
      // Queue medium-priority delete event
      const success = await this.messageQueueService.publishEvent({
        eventType: 'deleteMessage',
        userId: client.account.id,
        socketId: client.id,
        data: {
          messageId: deleteDto.messageId,
          conversationId: deleteDto.conversationId,
          conversationType: deleteDto.conversationType,
        },
        timestamp: new Date(),
        priority: 5,
      });

      if (!success) {
        client.emit('deleteMessageError', { message: 'Failed to delete message' });
      }

    } catch (error) {
      this.logger.error(`Error queuing delete message: ${error.message}`);
      client.emit('deleteMessageError', { message: 'Internal server error' });
    }
  }

  // =============== Real-time Events (Direct Processing) ===============

  @SubscribeMessage('messageRead')
  async handleMessageRead(
    client: AuthenticatedSocket,
    data: { messageId: number; conversationId: number; conversationType: string }
  ): Promise<void> {
    // Process immediately for real-time read receipts
    await this.messageHandler.handleMessageRead(client, data);
  }

  @SubscribeMessage('answerCall')
  async handleAnswerCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    // Process immediately for time-critical call responses
    await this.callHandler.handleAnswerCall(client, callDto);
  }

  @SubscribeMessage('refuseCall')
  async handleRefuseCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    // Process immediately for time-critical call responses
    await this.callHandler.handleRefuseCall(client, callDto);
  }

  @SubscribeMessage('giveUpCall')
  async handleGiveUpCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    await this.callHandler.handleGiveUpCall(client, callDto);
  }

  @SubscribeMessage('closeCall')
  async handleCloseCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    await this.callHandler.handleCloseCall(client, callDto);
  }

  @SubscribeMessage('completeCloseCall')
  async handleCompleteCloseCall(client: AuthenticatedSocket): Promise<void> {
    await this.callHandler.handleCompleteCloseCall(client);
  }

  // =============== Presence and Status Updates ===============

  @SubscribeMessage('updatePresence')
  async handlePresenceUpdate(
    client: AuthenticatedSocket,
    data: { status: 'online' | 'away' | 'busy'; activity?: string }
  ): Promise<void> {
    try {
      // Queue low-priority presence event
      await this.messageQueueService.publishEvent({
        eventType: 'presence',
        userId: client.account.id,
        socketId: client.id,
        data: {
          status: data.status,
          activity: data.activity,
        },
        timestamp: new Date(),
        priority: 3,
      });
    } catch (error) {
      this.logger.error(`Error updating presence: ${error.message}`);
    }
  }

  // =============== Performance Monitoring ===============

  @SubscribeMessage('getStats')
  async handleGetStats(client: AuthenticatedSocket): Promise<void> {
    try {
      const [queueStats, cacheStats] = await Promise.all([
        this.eventProcessor.getProcessingStats(),
        this.cacheManager.getPerformanceStats(),
      ]);

      client.emit('serverStats', {
        queue: queueStats,
        cache: cacheStats,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error getting stats: ${error.message}`);
      client.emit('getStatsError', { message: 'Failed to get statistics' });
    }
  }

  // =============== Private Helper Methods ===============

  /**
   * Build user relationship graph for efficient broadcasting
   */
  private async buildUserRelationshipGraph(client: AuthenticatedSocket): Promise<void> {
    try {
      const userId = client.account.id;
      
      // This would typically come from the database or be cached
      // For now, we'll use the existing friend service methods
      const [friendIds, groupIds] = await Promise.all([
        this.connectionHandler['friendsService']?.getFriendIds(userId) || [],
        this.connectionHandler['friendsService']?.getGroupIds(userId) || [],
      ]);

      // Build the relationship graph in Redis
      await this.cacheManager.buildUserRelationshipGraph(userId, friendIds, groupIds);

      // Add user to relevant rooms
      for (const groupId of groupIds) {
        await this.cacheManager.addUserToRoom(`group:${groupId}`, userId, 'group');
        client.join(`group:${groupId}`);
      }

      for (const friendId of friendIds) {
        const roomName = `friend:${Math.min(userId, friendId)}:${Math.max(userId, friendId)}`;
        await this.cacheManager.addUserToRoom(roomName, userId, 'friend');
        client.join(roomName);
      }

    } catch (error) {
      this.logger.error(`Error building relationship graph: ${error.message}`);
    }
  }

  /**
   * Authenticate socket connection
   */
  private authenticateSocket(
    socket: AuthenticatedSocket,
    next: (err?: Error) => void
  ): void {
    try {
      const token = socket.handshake.auth?.token ||
                   socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.securityService.markSuspiciousActivity(socket.handshake.address);
        return next(new Error('Authentication token is missing'));
      }

      const payload = this.jwtService.verify(token);
      payload.socketId = socket.id;
      socket.account = payload;
      
      next();
    } catch (err) {
      this.securityService.markSuspiciousActivity(socket.handshake.address);
      return next(new Error('Invalid token'));
    }
  }

  /**
   * Configure server settings
   */
  private configureServer(server: Server): void {
    // Error handling
    server.on('error', (error) => {
      this.logger.error('WebSocket Server Error:', error);
    });

    // Connection limits
    server.setMaxListeners(100);

    // Configure engine options for high performance
    if (server.engine) {
      server.engine.opts.pingTimeout = 10000;
      server.engine.opts.pingInterval = 5000;
      server.engine.opts.upgradeTimeout = 10000;
      server.engine.opts.maxHttpBufferSize = 1e6; // 1MB
    }
  }
}
