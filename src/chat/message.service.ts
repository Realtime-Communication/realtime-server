import { ForbiddenException, Inject, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { MessageDto, CallDto, CallResponseDto } from './dto/create-message.dto';
import {
  CallStatus,
  CallType,
  MessageStatus,
  MessageType,
} from '@prisma/client';
import * as crypto from 'crypto';
import { MessageVm } from './dto/message.vm';
import { UpdateMessageDto } from './dto/update-message.dto';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';

@Injectable()
export class ChatService {
  constructor(private readonly prismaService: PrismaService) { }

  async saveMessage(account: TAccountRequest, messageDto: MessageDto) {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: messageDto.conversationId,
        deleted_at: null,
        participants: {
          some: {
            user_id: account.id,
          },
        },
      },
    });

    if (!conversation) {
      return;
    }

    const message = await this.prismaService.message.create({
      data: {
        guid: messageDto.guid,
        conversation_id: messageDto.conversationId,
        sender_id: account.id,
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
    }) as any; // Type assertion to fix TypeScript type inference

    // Update conversation's last activity
    await this.prismaService.conversation.update({
      where: { id: messageDto.conversationId },
      data: { updated_at: new Date() },
    });

    return {
      id: message.id,
      guid: message.guid,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      messageType: message.message_type,
      content: message.content,
      createdAt: message.created_at,
      deletedAt: message.deleted_at,
      callType: message.call_type,
      call_status: message.call_status,
      status: message.message_status,
      sender: message.sender ? {
        id: message.sender.id,
        firstName: message.sender.first_name,
        lastName: message.sender.last_name,
        email: message.sender.email,
      } : undefined,
      attachments: message.attachments?.map(att => ({
        id: att.id,
        thumbUrl: att.thumb_url,
        fileUrl: att.file_url,
      })),
    };
  }

  async deleteMessage(account: TAccountRequest, messageId: number) {
    // Find message and check permissions
    const message = await this.prismaService.message.findFirst({
      where: {
        id: messageId,
        deleted_at: null,
        conversation: {
          participants: {
            some: {
              user_id: account.id,
            },
          },
        },
      },
      include: {
        conversation: {
          select: {
            participants: {
              where: {
                user_id: account.id,
              },
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return;
    }

    // Check if user is message sender or conversation leader
    const isLeader = message.conversation.participants[0]?.type === 'LEAD';
    const isSender = message.sender_id === account.id;

    if (!isLeader && !isSender) {
      throw new Error('You do not have permission to delete this message');
    }

    // Soft delete the message
    const deletedMessage = await this.prismaService.message.update({
      where: {
        id: messageId,
      },
      data: {
        deleted_at: new Date(),
        deleted_messages: {
          create: {
            user_id: account.id,
          },
        },
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
        deleted_messages: {
          where: {
            user_id: account.id,
          },
          select: {
            created_at: true,
          },
        },
      },
    });

    return {
      id: deletedMessage.id,
      deleted_at: deletedMessage.deleted_at,
      deleted_by: {
        id: account.id,
        deleted_at: deletedMessage.deleted_messages[0]?.created_at,
      },
    };
  }

  async validateConversationAccess(
    userId: number,
    conversationId: number,
  ): Promise<boolean> {
    const participant = await this.prismaService.participant.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId,
        conversation: {
          deleted_at: null,
        },
      },
    });

    return !!participant;
  }

  async handleCall(account: TAccountRequest, callDto: CallDto) {
    // Validate that the caller has access to the conversation with the callee
    const hasAccess = await this.validateConversationAccess(
      account.id,
      callDto.conversationId,
    );
    if (!hasAccess) {
      throw new Error('Call access denied');
    }

    // Create a call record in the database
    const call = await this.prismaService.message.create({
      data: {
        guid: crypto.randomUUID(),
        conversation_id: callDto.conversationId,
        sender_id: account.id,
        message_type: MessageType.CALL,
        call_type: CallType.VOICE,
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

    return call;
  }

  async handleCallResponse(account: TAccountRequest, responseDto: CallDto) {
    // Update call status in the database
    const call = await this.prismaService.message.updateMany({
      where: {
        conversation_id: responseDto.conversationId,
        sender_id: account.id,
        message_type: MessageType.CALL,
        call_status: CallStatus.INVITED,
      },
      data: {
        call_status: CallStatus.ONGOING,
      },
    });

    return call;
  }

  async handleCallEnd(account: TAccountRequest, callDto: CallDto) {
    // Update call status to ended
    const call = await this.prismaService.message.updateMany({
      where: {
        conversation_id: callDto.conversationId,
        sender_id: account.id,
        message_type: MessageType.CALL,
        call_status: {
          in: [CallStatus.INVITED, CallStatus.ONGOING],
        },
      },
      data: {
        call_status: CallStatus.ENDED,
      },
    });

    return call;
  }

  async getMessagesByConversation(
    userId: number,
    conversationId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<MessageVm>> {
    await this.verifyConversationAccess(userId, conversationId);

    const skip = (page - 1) * limit;
    const [total, messages] = await Promise.all([
      this.prismaService.message.count({
        where: { conversation_id: conversationId },
      }),
      this.prismaService.message.findMany({
        where: { conversation_id: conversationId },
        include: { attachments: true },
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

  async getMessage(userId: number, messageId: number): Promise<MessageVm> {
    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
      include: { attachments: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.verifyConversationAccess(userId, message.conversation_id);

    return this.mapToMessageResponse(message);
  }

  async updateMessage(
    userId: number,
    messageId: number,
    updateMessageDto: UpdateMessageDto
  ): Promise<MessageVm> {
    const message = await this.prismaService.message.findUnique({
      where: { id: messageId },
      include: { attachments: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only update your own messages');
    }

    const updatedMessage = await this.prismaService.message.update({
      where: { id: messageId },
      data: {
        content: updateMessageDto.content,
        message_status: updateMessageDto.status,
        deleted_at: updateMessageDto.deleted_at,
      },
      include: { attachments: true },
    });

    return this.mapToMessageResponse(updatedMessage);
  } 

  private async verifyConversationAccess(userId: number, conversationId: number): Promise<boolean> {
    const participant = await this.prismaService.participant.findFirst({
      where: {
        user_id: userId,
        conversation_id: conversationId,
      },
    });

    if (!participant) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return true;
  }

  private mapToMessageResponse(message: any): MessageVm  {
    return {
      id: message.id,
      guid: message.guid,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      messageType: message.message_type,
      content: message.content,
      callType: message.call_type,
      callStatus: message.call_status,
      status: message.message_status,
      createdAt: message.created_at,
      deletedAt: message.deleted_at,
      attachments: message.attachments?.map(attachment => ({
        id: attachment.id,
        thumbUrl: attachment.thumb_url,
        fileUrl: attachment.file_url,
      })) || [],
    };
  }
}
