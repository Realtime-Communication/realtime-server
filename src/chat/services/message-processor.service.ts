import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Server } from 'socket.io';
import { MessageQueueService, QueueMessage, QueueType } from './message-queue.service';
import { ChatService } from '../chat.service';
import { CreateMessageDto, CallDto, TypingDto, DeleteMessageDto } from '../dto';
import { RoomUtil } from '../utils/room.util';
import { ConversationType } from 'src/groups/model/conversation.vm';
import { CallStatus } from '@prisma/client';

@Injectable()
export class MessageProcessorService implements OnModuleInit {
  private readonly logger = new Logger(MessageProcessorService.name);
  private server: Server;

  constructor(
    private readonly messageQueueService: MessageQueueService,
    private readonly chatService: ChatService,
  ) {}

  async onModuleInit() {
    // Setup consumers for each queue type
    await this.setupConsumers();
  }

  setServer(server: Server) {
    this.server = server;
  }

  private async setupConsumers(): Promise<void> {
    // High priority consumer (Messages, calls)
    await this.messageQueueService.setupConsumer(
      QueueType.MESSAGES_HIGH,
      (message) => this.processHighPriorityMessage(message),
      { prefetch: 5, maxRetries: 3 }
    );

    // Medium priority consumer (Group operations, deletes)  
    await this.messageQueueService.setupConsumer(
      QueueType.MESSAGES_MEDIUM,
      (message) => this.processMediumPriorityMessage(message),
      { prefetch: 10, maxRetries: 3 }
    );

    // Low priority consumer (Typing, presence)
    await this.messageQueueService.setupConsumer(
      QueueType.MESSAGES_LOW,
      (message) => this.processLowPriorityMessage(message),
      { prefetch: 20, maxRetries: 2 }
    );

    this.logger.log('All message processors initialized');
  }

  private async processHighPriorityMessage(queueMessage: QueueMessage): Promise<void> {
    const { type, payload, userId, socketId } = queueMessage;
    
    this.logger.debug(`Processing high priority message: ${type} from user ${userId}`);

    try {
      switch (type) {
        case 'sendMessage':
          await this.processSendMessage(payload, userId, socketId);
          break;
        case 'callUser':
          await this.processCallUser(payload, userId, socketId);
          break;
        case 'answerCall':
          await this.processAnswerCall(payload, userId, socketId);
          break;
        case 'refuseCall':
          await this.processRefuseCall(payload, userId, socketId);
          break;
        case 'closeCall':
          await this.processCloseCall(payload, userId, socketId);
          break;
        default:
          this.logger.warn(`Unknown high priority message type: ${type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing high priority message ${type}:`, error);
      throw error;
    }
  }

  private async processMediumPriorityMessage(queueMessage: QueueMessage): Promise<void> {
    const { type, payload, userId, socketId } = queueMessage;
    
    this.logger.debug(`Processing medium priority message: ${type} from user ${userId}`);

    try {
      switch (type) {
        case 'deleteMessage':
          await this.processDeleteMessage(payload, userId, socketId);
          break;
        case 'joinGroup':
          await this.processJoinGroup(payload, userId, socketId);
          break;
        case 'messageRead':
          await this.processMessageRead(payload, userId, socketId);
          break;
        case 'updateMessage':
          await this.processUpdateMessage(payload, userId, socketId);
          break;
        default:
          this.logger.warn(`Unknown medium priority message type: ${type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing medium priority message ${type}:`, error);
      throw error;
    }
  }

  private async processLowPriorityMessage(queueMessage: QueueMessage): Promise<void> {
    const { type, payload, userId, socketId } = queueMessage;
    
    this.logger.debug(`Processing low priority message: ${type} from user ${userId}`);

    try {
      switch (type) {
        case 'typing':
          await this.processTyping(payload, userId, socketId);
          break;
        case 'presence':
          await this.processPresence(payload, userId, socketId);
          break;
        case 'ping':
          await this.processPing(payload, userId, socketId);
          break;
        default:
          this.logger.warn(`Unknown low priority message type: ${type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing low priority message ${type}:`, error);
      throw error;
    }
  }

  // =============== High Priority Message Processors ===============

  private async processSendMessage(payload: CreateMessageDto & { account: any }, userId: number, socketId?: string): Promise<void> {
    const { account, ...messageDto } = payload;
    
    // Save message to database
    const savedMessage = await this.chatService.saveMessage(account, messageDto);
    
    // Get target rooms
    const targetRooms = RoomUtil.getTargetRooms(
      messageDto.conversationType,
      messageDto.conversationId,
      userId
    );

    // Broadcast to conversation participants
    await this.broadcastToRooms('messageComing', savedMessage, targetRooms);
    
    // Update last message for conversation
    await this.broadcastToRooms('loadLastMessage', { 
      conversationId: messageDto.conversationId 
    }, targetRooms);

    // Send confirmation to sender
    if (socketId) {
      this.server.to(socketId).emit('messageProcessed', {
        tempId: messageDto.guid,
        messageId: savedMessage.id,
        status: 'success'
      });
    }

    this.logger.debug(`Message processed and broadcasted: ${savedMessage.id}`);
  }

  private async processCallUser(payload: CallDto & { account: any }, userId: number, socketId?: string): Promise<void> {
    const { account, ...callDto } = payload;
    
    // Create call record
    const callMessage = await this.chatService.handleCall(account, callDto);
    
    // Get target rooms
    const targetRooms = RoomUtil.getTargetRooms(
      callDto.conversationType,
      callDto.conversationId,
      userId
    );

    // Check if anyone is online
    const hasOnlineUsers = await this.checkOnlineUsers(targetRooms, socketId);
    
    if (!hasOnlineUsers) {
      if (socketId) {
        this.server.to(socketId).emit('userNotOnline', {
          message: 'The user you are trying to call is not online'
        });
      }
      return;
    }

    // Broadcast call invitation
    const callData = {
      ...callDto,
      callerInfo: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
      },
      timestamp: new Date(),
    };

    await this.broadcastToRooms('callUser', callData, targetRooms, socketId);
    await this.broadcastToRooms('openCall', callData, targetRooms, socketId);

    this.logger.debug(`Call initiated: ${callMessage.id}`);
  }

  private async processAnswerCall(payload: CallDto & { account: any }, userId: number, socketId?: string): Promise<void> {
    const { account, ...callDto } = payload;
    
    // Update call status
    await this.chatService.handleCallResponse(account, callDto, CallStatus.ONGOING);
    
    // Get target rooms
    const targetRooms = RoomUtil.getTargetRooms(
      callDto.conversationType,
      callDto.conversationId,
      userId
    );

    // Broadcast call accepted
    const responseData = {
      ...callDto,
      answeredBy: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
      },
      timestamp: new Date(),
    };

    await this.broadcastToRooms('callAccepted', responseData, targetRooms, socketId);
    
    this.logger.debug(`Call answered by user: ${userId}`);
  }

  private async processRefuseCall(payload: CallDto & { account: any }, userId: number, socketId?: string): Promise<void> {
    const { account, ...callDto } = payload;
    
    // Update call status
    await this.chatService.handleCallResponse(account, callDto, CallStatus.ENDED);
    
    // Get target rooms
    const targetRooms = RoomUtil.getTargetRooms(
      callDto.conversationType,
      callDto.conversationId,
      userId
    );

    // Broadcast call refused
    const responseData = {
      ...callDto,
      refusedBy: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
      },
      timestamp: new Date(),
    };

    await this.broadcastToRooms('refuseCall', responseData, targetRooms);
    
    this.logger.debug(`Call refused by user: ${userId}`);
  }

  private async processCloseCall(payload: CallDto & { account: any }, userId: number, socketId?: string): Promise<void> {
    const { account, ...callDto } = payload;
    
    // Update call status
    await this.chatService.handleCallResponse(account, callDto, CallStatus.ENDED);
    
    // Get target rooms
    const targetRooms = RoomUtil.getTargetRooms(
      callDto.conversationType,
      callDto.conversationId,
      userId
    );

    // Broadcast call ended
    const closeData = {
      closedBy: userId,
      closedAt: new Date(),
      conversationId: callDto.conversationId,
    };

    await this.broadcastToRooms('closeCall', closeData, targetRooms);
    
    this.logger.debug(`Call closed by user: ${userId}`);
  }

  // =============== Medium Priority Message Processors ===============

  private async processDeleteMessage(payload: DeleteMessageDto & { account: any }, userId: number, socketId?: string): Promise<void> {
    const { account, ...deleteDto } = payload;
    
    const deletedMessage = await this.chatService.deleteMessage(account, deleteDto.messageId);
    
    if (!deletedMessage) {
      if (socketId) {
        this.server.to(socketId).emit('deleteMessageError', { message: 'Message not found' });
      }
      return;
    }

    // Get target rooms
    const targetRooms = RoomUtil.getTargetRooms(
      deleteDto.conversationType,
      deleteDto.conversationId,
      userId
    );

    // Broadcast deletion
    const deleteData = {
      messageId: deleteDto.messageId,
      deletedBy: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
      },
      deletedAt: new Date(),
      conversationId: deleteDto.conversationId,
    };

    await this.broadcastToRooms('messageDeleted', deleteData, targetRooms);
    
    this.logger.debug(`Message deleted: ${deleteDto.messageId}`);
  }

  private async processJoinGroup(payload: { groupId: number; account: any }, userId: number, socketId?: string): Promise<void> {
    const { groupId } = payload;
    const groupRoom = RoomUtil.getGroupRoomName(groupId);
    
    // Add user to group room (handled by connection management)
    if (socketId) {
      this.server.sockets.sockets.get(socketId)?.join(groupRoom);
      
      // Confirm join
      this.server.to(socketId).emit('joinedGroup', { 
        groupId, 
        roomName: groupRoom 
      });
    }

    // Notify other group members
    await this.broadcastToRooms('userJoinedGroup', {
      userId,
      groupId,
      timestamp: new Date(),
    }, [groupRoom], socketId);
    
    this.logger.debug(`User ${userId} joined group: ${groupId}`);
  }

  private async processMessageRead(payload: { messageId: number; conversationId: number; conversationType: ConversationType; account: any }, userId: number, socketId?: string): Promise<void> {
    const { messageId, conversationId, conversationType } = payload;
    
    // Get target rooms
    const targetRooms = RoomUtil.getTargetRooms(
      conversationType,
      conversationId,
      userId
    );

    // Broadcast read receipt
    const readData = {
      messageId,
      readBy: {
        id: userId,
        firstName: payload.account.firstName,
        lastName: payload.account.lastName,
      },
      readAt: new Date(),
      conversationId,
    };

    await this.broadcastToRooms('messageRead', readData, targetRooms, socketId);
    
    this.logger.debug(`Message read: ${messageId} by user ${userId}`);
  }

  private async processUpdateMessage(payload: { messageId: number; updateData: any; account: any }, userId: number, socketId?: string): Promise<void> {
    const { messageId, updateData } = payload;
    
    const updatedMessage = await this.chatService.updateMessage(userId, messageId, updateData);
    
    // Broadcast update (implementation depends on your requirements)
    // This is a placeholder - you might want to implement message updates
    
    this.logger.debug(`Message updated: ${messageId}`);
  }

  // =============== Low Priority Message Processors ===============

  private async processTyping(payload: TypingDto & { account: any }, userId: number, socketId?: string): Promise<void> {
    const { account, ...typingDto } = payload;
    
    // Get target rooms
    const targetRooms = RoomUtil.getTargetRooms(
      typingDto.conversationType,
      typingDto.conversationId,
      userId
    );

    // Broadcast typing indicator
    const typingData = {
      user: {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
      },
      conversationId: typingDto.conversationId,
      conversationType: typingDto.conversationType,
      isTyping: typingDto.isTyping,
      timestamp: new Date(),
    };

    await this.broadcastToRooms('typing', typingData, targetRooms, socketId);
  }

  private async processPresence(payload: { status: string; account: any }, userId: number, socketId?: string): Promise<void> {
    const { status } = payload;
    
    const presenceData = {
      userId,
      status,
      timestamp: new Date(),
    };

    // Broadcast to all online users
    await this.broadcastToRooms('userPresenceUpdate', presenceData, [RoomUtil.getOnlineUsersRoom()]);
  }

  private async processPing(payload: any, userId: number, socketId?: string): Promise<void> {
    if (socketId) {
      this.server.to(socketId).emit('pong', { 
        timestamp: new Date(),
        userId 
      });
    }
  }

  // =============== Utility Methods ===============

  private async broadcastToRooms(
    eventName: string, 
    data: any, 
    targetRooms: string[], 
    excludeSocketId?: string
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('Server not initialized, cannot broadcast');
      return;
    }

    targetRooms.forEach(room => {
      let emitter = this.server.to(room);
      
      if (excludeSocketId) {
        emitter = emitter.except(excludeSocketId);
      }
      
      emitter.emit(eventName, data);
    });
  }

  private async checkOnlineUsers(targetRooms: string[], excludeSocketId?: string): Promise<boolean> {
    if (!this.server) return false;

    for (const room of targetRooms) {
      const roomSockets = this.server.sockets.adapter.rooms.get(room);
      if (roomSockets && roomSockets.size > (excludeSocketId ? 1 : 0)) {
        return true;
      }
    }
    return false;
  }
} 
