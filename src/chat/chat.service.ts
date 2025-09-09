import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import {
  CreateMessageDto,
  UpdateMessageDto,
  DeleteMessageDto,
  MessageResponseDto,
  CallDto,
  TypingDto,
} from './dto';
import { Message, UserPresence } from './entities';
import { SecurityUtil } from './utils/security.util';
import {
  CallStatus,
  CallType,
  MessageStatus,
  MessageType,
} from '@prisma/client';
import { RoomUtil } from './utils/room.util';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private userPresences = new Map<number, UserPresence>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    // Clean up rate limit data every 5 minutes
    setInterval(() => {
      SecurityUtil.cleanupRateLimitData();
    }, 5 * 60 * 1000);
  }

  // =============== Message Operations ===============

  async saveMessage(user: TAccountRequest, messageDto: CreateMessageDto): Promise<MessageResponseDto> {
    // Validate conversation access
    await this.validateConversationAccess(user.id, messageDto.conversationId);

    // Security checks
    if (!SecurityUtil.checkRateLimit(user.id)) {
      throw new ForbiddenException('Rate limit exceeded');
    }

    if (messageDto.content) {
      if (SecurityUtil.isSpamContent(messageDto.content)) {
        throw new ForbiddenException('Spam content detected');
      }
      messageDto.content = SecurityUtil.filterContent(messageDto.content);
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        guid: messageDto.guid || crypto.randomUUID(),
        conversation_id: messageDto.conversationId,
        sender_id: user.id,
        message_type: messageDto.messageType,
        content: messageDto.content || '',
        call_type: messageDto.callType || CallType.VOICE,
        call_status: messageDto.callStatus || CallStatus.ENDED,
        message_status: messageDto.status || MessageStatus.SENT,
        attachments: messageDto.attachments
          ? {
              create: messageDto.attachments.map((attachment) => ({
                thumb_url: attachment.thumbUrl,
                file_url: attachment.fileUrl,
              })),
            }
          : undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        attachments: true,
      },
    });

    // Update conversation's last activity
    await this.prisma.conversation.update({
      where: { id: messageDto.conversationId },
      data: { updated_at: new Date() },
    });

    return this.mapToMessageResponse(message);
  }

  async updateMessage(
    userId: number,
    messageId: number,
    updateDto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { attachments: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only update your own messages');
    }

    // Filter content if provided
    if (updateDto.content) {
      updateDto.content = SecurityUtil.filterContent(updateDto.content);
    }

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: updateDto.content,
        message_status: updateDto.status,
        deleted_at: updateDto.deletedAt,
      },
      include: { 
        attachments: true,
        sender: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return this.mapToMessageResponse(updatedMessage);
  }

  async deleteMessage(user: TAccountRequest, messageId: number): Promise<MessageResponseDto | null> {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        deleted_at: null,
        conversation: {
          participants: {
            some: {
              user_id: user.id,
            },
          },
        },
      },
      include: {
        conversation: {
          select: {
            participants: {
              where: { user_id: user.id },
              select: { type: true },
            },
          },
        },
      },
    });

    if (!message) {
      return null;
    }

    // Check permissions
    const isLeader = message.conversation.participants[0]?.type === 'LEAD';
    const isSender = message.sender_id === user.id;

    if (!isLeader && !isSender) {
      throw new ForbiddenException('You do not have permission to delete this message');
    }

    // Soft delete
    const deletedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deleted_at: new Date(),
        deleted_messages: {
          create: { user_id: user.id },
        },
      },
      include: { 
        attachments: true,
        sender: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return this.mapToMessageResponse(deletedMessage);
  }

  async getMessagesByConversation(
    userId: number,
    conversationId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<MessageResponseDto>> {
    await this.validateConversationAccess(userId, conversationId);

    const skip = (page - 1) * limit;
    const [total, messages] = await Promise.all([
      this.prisma.message.count({
        where: { conversation_id: conversationId },
      }),
      this.prisma.message.findMany({
        where: { conversation_id: conversationId },
        include: { 
          attachments: true,
          sender: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: messages.map(message => this.mapToMessageResponse(message)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMessage(userId: number, messageId: number): Promise<MessageResponseDto> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { 
        attachments: true,
        sender: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.validateConversationAccess(userId, message.conversation_id);
    return this.mapToMessageResponse(message);
  }

  // =============== Call Operations ===============

  async handleCall(user: TAccountRequest, callDto: CallDto): Promise<MessageResponseDto> {
    await this.validateConversationAccess(user.id, callDto.conversationId);

    const callMessage = await this.prisma.message.create({
      data: {
        guid: crypto.randomUUID(),
        conversation_id: callDto.conversationId,
        sender_id: user.id,
        message_type: MessageType.CALL,
        call_type: callDto.callType || CallType.VOICE,
        call_status: CallStatus.INVITED,
        message_status: MessageStatus.SENT,
      },
      include: {
        sender: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return this.mapToMessageResponse(callMessage);
  }

  async handleCallResponse(user: TAccountRequest, callDto: CallDto, status: CallStatus): Promise<void> {
    await this.prisma.message.updateMany({
      where: {
        conversation_id: callDto.conversationId,
        message_type: MessageType.CALL,
        call_status: CallStatus.INVITED,
      },
      data: {
        call_status: status,
      },
    });
  }

  // =============== Presence Management ===============

  async setUserOnline(userId: number, socketId: string): Promise<void> {
    // Update local cache
    this.userPresences.set(userId, {
      userId,
      status: 'online',
      lastSeen: new Date(),
      socketId,
    });

    // Update Redis cache
    await this.redis.setex(`user:${userId}:online`, 3600, '1');
    await this.redis.set(`user:${userId}:socket`, socketId);
  }

  async setUserOffline(userId: number): Promise<void> {
    // Update local cache
    const presence = this.userPresences.get(userId);
    if (presence) {
      presence.status = 'offline';
      presence.lastSeen = new Date();
    }

    // Update Redis cache
    await this.redis.del(`user:${userId}:online`);
    await this.redis.del(`user:${userId}:socket`);
  }

  async getUserPresence(userId: number): Promise<UserPresence | null> {
    return this.userPresences.get(userId) || null;
  }

  async getOnlineUsers(): Promise<number[]> {
    const onlineUsers: number[] = [];
    for (const [userId, presence] of this.userPresences.entries()) {
      if (presence.status === 'online') {
        onlineUsers.push(userId);
      }
    }
    return onlineUsers;
  }

  // =============== Room Management ===============

  async getUserRooms(userId: number): Promise<string[]> {
    // Get user's conversations
    const participants = await this.prisma.participant.findMany({
      where: { user_id: userId },
      select: { conversation_id: true },
    });

    const rooms: string[] = [];
    for (const participant of participants) {
      const conversationId = participant.conversation_id;
      
      // Check if it's a friend conversation (2 participants) or group (more than 2)
      const participantCount = await this.prisma.participant.count({
        where: { conversation_id: conversationId },
      });

      if (participantCount === 2) {
        // Friend conversation - get the other participant
        const otherParticipant = await this.prisma.participant.findFirst({
          where: {
            conversation_id: conversationId,
            user_id: { not: userId },
          },
        });
        if (otherParticipant) {
          rooms.push(RoomUtil.generateFriendRoomId(userId, otherParticipant.user_id));
        }
      } else {
        // Group conversation
        rooms.push(RoomUtil.generateGroupRoomId(conversationId));
      }
    }

    return rooms;
  }

  // =============== Utility Methods ===============

  async validateConversationAccess(userId: number, conversationId: number): Promise<boolean> {
    const participant = await this.prisma.participant.findFirst({
      where: {
        user_id: userId,
        conversation_id: conversationId,
        conversation: {
          deleted_at: null,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return true;
  }

  private mapToMessageResponse(message: any): MessageResponseDto {
    return {
      id: message.id,
      guid: message.guid,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      messageType: message.message_type,
      content: message.content || '',
      createdAt: message.created_at,
      deletedAt: message.deleted_at,
      callType: message.call_type,
      callStatus: message.call_status,
      status: message.message_status,
      attachments: message.attachments?.map(att => ({
        id: att.id,
        thumbUrl: att.thumb_url,
        fileUrl: att.file_url,
      })),
      sender: message.sender ? {
        id: message.sender.id,
        firstName: message.sender.first_name,
        lastName: message.sender.last_name,
        email: message.sender.email,
      } : undefined,
    };
  }

  // =============== Health Check ===============

  async healthCheck(): Promise<{ status: string; redis: boolean; database: boolean }> {
    let redisStatus = false;
    let dbStatus = false;

    try {
      await this.redis.ping();
      redisStatus = true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
    }

    return {
      status: redisStatus && dbStatus ? 'healthy' : 'unhealthy',
      redis: redisStatus,
      database: dbStatus,
    };
  }
} 
