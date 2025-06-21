import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TAccountRequest } from 'src/decorators/account-request.decorator';

import {
  CallStatus,
  CallType,
  MessageStatus,
  MessageType,
  Prisma
} from '@prisma/client';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { MessageDto } from './dto/create-message.dto';
import { MessageVm } from './dto/message.vm';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) { }

  async createMessage(account: TAccountRequest, messageDto: MessageDto): Promise<MessageVm> {
    // Verify user has access to the conversation
    await this.verifyConversationAccess(account.id, messageDto.conversationId);

    const message = await this.prisma.message.create({
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
        attachments: true,
      },
    });

    return this.mapToMessageResponse(message);
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
      this.prisma.message.count({
        where: { conversation_id: conversationId },
      }),
      this.prisma.message.findMany({
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
    const message = await this.prisma.message.findUnique({
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

    const updatedMessage = await this.prisma.message.update({
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

  async deleteMessage(userId: number, messageId: number): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only allow sender to delete their own messages
    if (message.sender_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.message.delete({
      where: { id: messageId },
    });
  }

  private async verifyConversationAccess(userId: number, conversationId: number): Promise<boolean> {
    const participant = await this.prisma.participant.findFirst({
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

  private mapToMessageResponse(message: any): MessageVm {
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
