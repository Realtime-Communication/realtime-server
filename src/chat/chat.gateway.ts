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
import { WsJwtGuard, AuthenticatedSocket } from './guards/ws-jwt.guard';
import { CreateMessageDto, CallDto, TypingDto, DeleteMessageDto } from './dto';
import { ConversationType } from 'src/groups/model/conversation.vm';
import { 
  ConnectionHandler, 
  MessageHandler, 
  CallHandler, 
  RealtimeEventHandler 
} from './handlers';
import { MessageQueueService, MessageProcessorService, CacheManagerService } from './services';

@UseGuards(WsJwtGuard)
@UsePipes(new ValidationPipe({ 
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors) => new WsException(errors)
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

  private connectionHandler: ConnectionHandler;
  private messageHandler: MessageHandler;
  private callHandler: CallHandler;
  private realtimeEventHandler: RealtimeEventHandler;

  constructor(
    private readonly chatService: any,
    private readonly messageQueueService: MessageQueueService,
    private readonly messageProcessorService: MessageProcessorService,
    private readonly cacheManagerService: CacheManagerService
  ) {}

  async afterInit(server: Server): Promise<void> {
    this.logger.log('WebSocket Server initialized');
    
    // Initialize handlers with the server instance
    this.connectionHandler = new ConnectionHandler(this.chatService, server);
    this.messageHandler = new MessageHandler(this.chatService, server);
    this.callHandler = new CallHandler(this.chatService, server);
    this.realtimeEventHandler = new RealtimeEventHandler(server);
    
    // Set server reference in message processor
    this.messageProcessorService.setServer(server);
    
    this.logger.log('RabbitMQ-powered chat gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    await this.connectionHandler.handleConnection(client);
    
    // Cache user online status
    await this.cacheManagerService.setUserOnline(client.account.id, client.id);
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    await this.connectionHandler.handleDisconnection(client);
    
    // Remove user from cache
    if (client.account) {
      await this.cacheManagerService.setUserOffline(client.account.id);
    }
  }

  // =============== Message Operations (Queue-based) ===============

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    client: AuthenticatedSocket,
    messageDto: CreateMessageDto
  ): Promise<void> {
    try {
      // Generate message ID for immediate feedback
      const tempId = messageDto.guid || this.generateTempId();
      
      // Queue message for processing
      const queued = await this.messageQueueService.publishHighPriorityMessage(
        'sendMessage',
        { ...messageDto, account: client.account },
        client.account.id,
        client.id
      );

      if (queued) {
        // Immediate acknowledgment to user
        client.emit('messageQueued', {
          tempId,
          status: 'queued',
          timestamp: new Date()
        });
        
        this.logger.debug(`Message queued for user ${client.account.id}: ${tempId}`);
      } else {
        // Fallback to direct processing if queue is unavailable
        this.logger.warn('Message queue unavailable, falling back to direct processing');
        await this.messageHandler.handleSendMessage(client, messageDto);
      }
    } catch (error) {
      this.logger.error('Error handling send message:', error);
      client.emit('sendMessageError', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    client: AuthenticatedSocket,
    deleteDto: DeleteMessageDto
  ): Promise<void> {
    try {
      // Queue deletion for processing
      const queued = await this.messageQueueService.publishMediumPriorityMessage(
        'deleteMessage',
        { ...deleteDto, account: client.account },
        client.account.id,
        client.id
      );

      if (queued) {
        // Immediate acknowledgment
        client.emit('deleteMessageQueued', {
          messageId: deleteDto.messageId,
          status: 'queued',
          timestamp: new Date()
        });
        
        this.logger.debug(`Message deletion queued for user ${client.account.id}: ${deleteDto.messageId}`);
      } else {
        // Fallback to direct processing
        this.logger.warn('Message queue unavailable, falling back to direct processing');
        await this.messageHandler.handleDeleteMessage(client, deleteDto);
      }
    } catch (error) {
      this.logger.error('Error handling delete message:', error);
      client.emit('deleteMessageError', { message: 'Failed to delete message' });
    }
  }

  // =============== Call Operations (Queue-based) ===============

  @SubscribeMessage('callUser')
  async handleCallUser(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    try {
      // Queue call initiation (high priority)
      const queued = await this.messageQueueService.publishHighPriorityMessage(
        'callUser',
        { ...callDto, account: client.account },
        client.account.id,
        client.id
      );

      if (queued) {
        this.logger.debug(`Call queued for user ${client.account.id}`);
      } else {
        // Fallback to direct processing
        await this.callHandler.handleCallUser(client, callDto);
      }
    } catch (error) {
      this.logger.error('Error handling call user:', error);
      client.emit('callUserError', { message: 'Failed to initiate call' });
    }
  }

  @SubscribeMessage('answerCall')
  async handleAnswerCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    try {
      // Call answers are time-critical, queue with high priority
      const queued = await this.messageQueueService.publishHighPriorityMessage(
        'answerCall',
        { ...callDto, account: client.account },
        client.account.id,
        client.id
      );

      if (queued) {
        this.logger.debug(`Call answer queued for user ${client.account.id}`);
      } else {
        // Fallback to direct processing for critical call responses
        await this.callHandler.handleAnswerCall(client, callDto);
      }
    } catch (error) {
      this.logger.error('Error handling answer call:', error);
      client.emit('answerCallError', { message: 'Failed to answer call' });
    }
  }

  @SubscribeMessage('refuseCall')
  async handleRefuseCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    try {
      // Queue call refusal (high priority)
      const queued = await this.messageQueueService.publishHighPriorityMessage(
        'refuseCall',
        { ...callDto, account: client.account },
        client.account.id,
        client.id
      );

      if (queued) {
        this.logger.debug(`Call refusal queued for user ${client.account.id}`);
      } else {
        // Fallback to direct processing
        await this.callHandler.handleRefuseCall(client, callDto);
      }
    } catch (error) {
      this.logger.error('Error handling refuse call:', error);
      client.emit('refuseCallError', { message: 'Failed to refuse call' });
    }
  }

  @SubscribeMessage('closeCall')
  async handleCloseCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    try {
      // Queue call closure (high priority)
      const queued = await this.messageQueueService.publishHighPriorityMessage(
        'closeCall',
        { ...callDto, account: client.account },
        client.account.id,
        client.id
      );

      if (queued) {
        this.logger.debug(`Call closure queued for user ${client.account.id}`);
      } else {
        // Fallback to direct processing
        await this.callHandler.handleCloseCall(client, callDto);
      }
    } catch (error) {
      this.logger.error('Error handling close call:', error);
      client.emit('closeCallError', { message: 'Failed to close call' });
    }
  }

  // =============== Real-time Events (Queue-based) ===============

  @SubscribeMessage('typing')
  async handleTyping(
    client: AuthenticatedSocket,
    typingDto: TypingDto
  ): Promise<void> {
    try {
      // Queue typing indicator (low priority)
      const queued = await this.messageQueueService.publishLowPriorityMessage(
        'typing',
        { ...typingDto, account: client.account },
        client.account.id,
        client.id
      );

      if (!queued) {
        // Fallback to direct processing for typing indicators
        await this.realtimeEventHandler.handleTyping(client, typingDto);
      }
    } catch (error) {
      this.logger.error('Error handling typing:', error);
      // Typing indicators are non-critical, no need to emit error
    }
  }

  @SubscribeMessage('messageRead')
  async handleMessageRead(
    client: AuthenticatedSocket,
    data: { messageId: number; conversationId: number; conversationType: ConversationType }
  ): Promise<void> {
    try {
      // Queue message read (medium priority)
      const queued = await this.messageQueueService.publishMediumPriorityMessage(
        'messageRead',
        { ...data, account: client.account },
        client.account.id,
        client.id
      );

      if (!queued) {
        // Fallback to direct processing
        await this.messageHandler.handleMessageRead(client, data);
      }
    } catch (error) {
      this.logger.error('Error handling message read:', error);
      // Message read is non-critical, no need to emit error
    }
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    client: AuthenticatedSocket,
    data: { groupId: number }
  ): Promise<void> {
    try {
      // Queue group join (medium priority)
      const queued = await this.messageQueueService.publishMediumPriorityMessage(
        'joinGroup',
        { ...data, account: client.account },
        client.account.id,
        client.id
      );

      if (!queued) {
        // Fallback to direct processing
        await this.connectionHandler.handleJoinGroup(client, data);
      }
    } catch (error) {
      this.logger.error('Error handling join group:', error);
      client.emit('joinGroupError', { message: 'Failed to join group' });
    }
  }

  // =============== Utility Events ===============

  @SubscribeMessage('getOnlineUsers')
  async handleGetOnlineUsers(client: AuthenticatedSocket): Promise<void> {
    try {
      // Get cached online users for faster response
      const onlineUsers = await this.cacheManagerService.getOnlineUsers();
      client.emit('onlineUsers', { users: onlineUsers });
    } catch (error) {
      this.logger.error('Error getting online users:', error);
      // Fallback to connection handler
      await this.connectionHandler.handleGetOnlineUsers(client);
    }
  }

  @SubscribeMessage('ping')
  async handlePing(client: AuthenticatedSocket): Promise<void> {
    try {
      // Queue ping (low priority)
      const queued = await this.messageQueueService.publishLowPriorityMessage(
        'ping',
        {},
        client.account.id,
        client.id
      );

      if (!queued) {
        // Direct response for ping
        client.emit('pong', { timestamp: new Date(), userId: client.account.id });
      }
    } catch (error) {
      this.logger.error('Error handling ping:', error);
      // Direct fallback for ping
      client.emit('pong', { timestamp: new Date(), userId: client.account.id });
    }
  }

  // =============== Utility Methods ===============

  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 
