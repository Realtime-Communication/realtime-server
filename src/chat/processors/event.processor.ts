import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';
import { MessageQueueService, QueuedEvent } from '../queue/message-queue.service';
import { ChatService } from '../message.service';
import { CacheManager } from '../cache.service';
import { WebSocketSecurityService } from '../websocket-security.service';
import { PresenceService } from '../services/presence.service';
import { WebSocketEventService } from '../services/websocket-event.service';
import { ConversationType } from 'src/groups/model/conversation.vm';
import * as crypto from 'crypto';
import { MessageDto } from '../dto/create-message.dto';
import { CallDto } from '../dto/create-message.dto';

@Injectable()
export class EventProcessor implements OnModuleInit {
  private readonly logger = new Logger(EventProcessor.name);
  private server: Server;

  constructor(
    private readonly messageQueueService: MessageQueueService,
    private readonly chatService: ChatService,
    private readonly cacheManager: CacheManager,
    private readonly securityService: WebSocketSecurityService,
    private readonly presenceService: PresenceService,
    private readonly eventService: WebSocketEventService,
  ) {}

  async onModuleInit() {
    await this.setupEventConsumers();
  }

  setServer(server: Server): void {
    this.server = server;
    this.eventService.setServer(server);
  }

  /**
   * Setup consumers for different priority queues
   */
  private async setupEventConsumers(): Promise<void> {
    // High priority queue (messages, calls)
    await this.messageQueueService.setupConsumer(
      'chat.events.high',
      this.processHighPriorityEvent.bind(this)
    );

    // Medium priority queue (group operations, deletes)
    await this.messageQueueService.setupConsumer(
      'chat.events.medium',
      this.processMediumPriorityEvent.bind(this)
    );

    // Low priority queue (typing, presence)
    await this.messageQueueService.setupConsumer(
      'chat.events.low',
      this.processLowPriorityEvent.bind(this)
    );

    this.logger.log('Event consumers initialized');
  }

  /**
   * Process high priority events (messages, calls)
   */
  private async processHighPriorityEvent(event: QueuedEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      switch (event.eventType) {
        case 'sendMessage':
          await this.processMessageEvent(event);
          break;
        case 'callRequest':
          await this.processCallEvent(event);
          break;
        default:
          this.logger.warn(`Unknown high priority event type: ${event.eventType}`);
      }

      const processingTime = Date.now() - startTime;
      this.logger.debug(`Processed ${event.eventType} in ${processingTime}ms`);
    } catch (error) {
      this.logger.error(`Failed to process high priority event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process medium priority events (group operations, deletes)
   */
  private async processMediumPriorityEvent(event: QueuedEvent): Promise<void> {
    try {
      switch (event.eventType) {
        case 'joinGroup':
          await this.processJoinGroupEvent(event);
          break;
        case 'deleteMessage':
          await this.processDeleteMessageEvent(event);
          break;
        default:
          this.logger.warn(`Unknown medium priority event type: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process medium priority event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process low priority events (typing, presence)
   */
  private async processLowPriorityEvent(event: QueuedEvent): Promise<void> {
    try {
      switch (event.eventType) {
        case 'typing':
          await this.processTypingEvent(event);
          break;
        case 'presence':
          await this.processPresenceEvent(event);
          break;
        default:
          this.logger.warn(`Unknown low priority event type: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process low priority event: ${error.message}`, error.stack);
      // Don't throw for low priority events to avoid blocking the queue
    }
  }

  /**
   * Process message sending event
   */
  private async processMessageEvent(event: QueuedEvent): Promise<void> {
    const { userId, data } = event;
    
    // Security validation
    if (!this.securityService.checkMessageRateLimit(userId)) {
      this.logger.warn(`Rate limit exceeded for user ${userId}`);
      return;
    }

    // Content validation and filtering
    if (data.content) {
      if (this.securityService.isSpamContent(data.content)) {
        this.logger.warn(`Spam detected from user ${userId}`);
        return;
      }
      data.content = this.securityService.filterContent(data.content);
    }

    // Set message metadata
    data.timestamp = new Date();
    data.guid = crypto.randomUUID();

    // Validate conversation access
    const hasAccess = await this.chatService.validateConversationAccess(
      userId,
      data.conversationId
    );

    if (!hasAccess) {
      this.logger.warn(`User ${userId} lacks access to conversation ${data.conversationId}`);
      return;
    }

    // Save message to database
    const savedMessage = await this.chatService.saveMessage(
      { id: userId } as any,
      data as MessageDto
    );

    if (!savedMessage) {
      this.logger.error(`Failed to save message for user ${userId}`);
      return;
    }

    // Get broadcast targets using Redis graph
    const broadcastInfo = await this.cacheManager.getBroadcastTargets(
      userId,
      data.conversationId,
      data.conversationType === ConversationType.FRIEND ? 'friend' : 'group'
    );

    // Broadcast to target users
    await this.eventService.emitToConversation(
      data.conversationId,
      data.conversationType,
      'messageComing',
      savedMessage,
      userId
    );

    // Update conversation activity
    await this.updateConversationActivity(data.conversationId);

    this.logger.debug(
      `Message broadcasted to ${broadcastInfo.onlineCount} online users in ${broadcastInfo.roomId}`
    );
  }

  /**
   * Process call request event
   */
  private async processCallEvent(event: QueuedEvent): Promise<void> {
    const { userId, data } = event;

    // Validate conversation access
    const hasAccess = await this.chatService.validateConversationAccess(
      userId,
      data.conversationId
    );

    if (!hasAccess) {
      this.logger.warn(`User ${userId} lacks access to conversation ${data.conversationId}`);
      return;
    }

    // Check if target users are online
    const broadcastInfo = await this.cacheManager.getBroadcastTargets(
      userId,
      data.conversationId,
      data.conversationType === ConversationType.FRIEND ? 'friend' : 'group'
    );

    if (broadcastInfo.onlineCount === 0) {
      // Notify caller that no one is online
      const callerSocket = await this.cacheManager.getUserSocket(userId);
      if (callerSocket) {
        this.server.to(callerSocket).emit('userNotOnline', {
          message: 'No users are currently online to receive the call'
        });
      }
      return;
    }

    // Create call record in database
    await this.chatService.handleCall({ id: userId } as any, data as CallDto);

    // Broadcast call to target users
    await this.eventService.emitToConversation(
      data.conversationId,
      data.conversationType,
      'callUser',
      {
        ...data,
        callerInfo: { id: userId },
        timestamp: new Date(),
      },
      userId
    );

    this.logger.debug(`Call request broadcasted to ${broadcastInfo.onlineCount} users`);
  }

  /**
   * Process join group event
   */
  private async processJoinGroupEvent(event: QueuedEvent): Promise<void> {
    const { userId, data } = event;
    const { groupId } = data;

    // Add user to room in Redis
    await this.cacheManager.addUserToRoom(`group:${groupId}`, userId, 'group');

    // Update user's relationship graph
    const currentGraph = await this.cacheManager.getUserRelationshipGraph(userId);
    if (currentGraph) {
      if (!currentGraph.groups.includes(groupId)) {
        currentGraph.groups.push(groupId);
        await this.cacheManager.buildUserRelationshipGraph(
          userId,
          currentGraph.friends,
          currentGraph.groups
        );
      }
    }

    // Notify other group members
    await this.eventService.emitToConversation(
      groupId,
      ConversationType.GROUP,
      'userJoinedGroup',
      {
        userId,
        groupId,
        timestamp: new Date(),
      },
      userId
    );

    this.logger.debug(`User ${userId} joined group ${groupId}`);
  }

  /**
   * Process delete message event
   */
  private async processDeleteMessageEvent(event: QueuedEvent): Promise<void> {
    const { userId, data } = event;
    const { messageId, conversationId } = data;

    // Delete message from database
    const deleted = await this.chatService.deleteMessage(
      { id: userId } as any,
      messageId
    );

    if (!deleted) {
      this.logger.warn(`Failed to delete message ${messageId} for user ${userId}`);
      return;
    }

    // Broadcast deletion to conversation participants
    await this.eventService.emitToConversation(
      conversationId,
      data.conversationType,
      'delete_message',
      {
        messageId,
        deletedBy: userId,
        deletedAt: new Date(),
        conversationId,
      }
    );

    this.logger.debug(`Message ${messageId} deleted by user ${userId}`);
  }

  /**
   * Process typing event
   */
  private async processTypingEvent(event: QueuedEvent): Promise<void> {
    const { userId, data } = event;

    // Use Redis graph for efficient targeting
    const broadcastInfo = await this.cacheManager.getBroadcastTargets(
      userId,
      data.conversationId,
      data.conversationType === ConversationType.FRIEND ? 'friend' : 'group'
    );

    if (broadcastInfo.onlineCount > 0) {
      await this.eventService.emitToConversation(
        data.conversationId,
        data.conversationType,
        'typing',
        {
          userId,
          isTyping: data.isTyping,
          timestamp: new Date(),
        },
        userId
      );
    }
  }

  /**
   * Process presence event
   */
  private async processPresenceEvent(event: QueuedEvent): Promise<void> {
    const { userId, data } = event;
    const { status, activity } = data;

    // Update presence in service
    await this.presenceService.updateUserStatus(userId, status, activity);

    // Get user's connected friends for broadcasting
    const connectedUsers = await this.cacheManager.getConnectedUsers(userId);

    if (connectedUsers.length > 0) {
      await this.eventService.emitToUsers(connectedUsers, 'presenceUpdate', {
        userId,
        status,
        activity,
        timestamp: new Date(),
      });
    }

    this.logger.debug(`Presence updated for user ${userId}: ${status}`);
  }

  /**
   * Update conversation activity timestamp
   */
  private async updateConversationActivity(conversationId: number): Promise<void> {
    try {
      // This could be optimized with a separate low-priority queue
      // For now, we'll just log it
      this.logger.debug(`Updating activity for conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to update conversation activity: ${error.message}`);
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<{
    queueStats: Record<string, any>;
    processingTimes: Record<string, number>;
  }> {
    const queueStats = await this.messageQueueService.getQueueStats();
    
    return {
      queueStats,
      processingTimes: {
        // These would be tracked in a real implementation
        avgMessageProcessing: 50,
        avgCallProcessing: 30,
        avgTypingProcessing: 10,
      },
    };
  }
} 
