import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { MessageRepository } from '../../domain/repositories/message.repository';
import { Message, MessageAttachment } from '../../domain/entities/message.entity';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';

@Injectable()
export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveMessage(message: Message): Promise<Message> {
    const savedMessage = await this.prisma.message.create({
      data: {
        guid: message.guid,
        conversation_id: message.conversationId,
        sender_id: message.senderId,
        message_type: message.messageType,
        content: message.content || '',
        call_type: message.callType,
        call_status: message.callStatus,
        message_status: message.status,
        attachments: message.attachments
          ? {
              create: message.attachments.map((attachment) => ({
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
      where: { id: message.conversationId },
      data: { updated_at: new Date() },
    });

    return this.mapToEntity(savedMessage);
  }

  async deleteMessage(messageId: number, userId: number): Promise<Message | null> {
    // Find message and check permissions
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        deleted_at: null,
        conversation: {
          participants: {
            some: {
              user_id: userId,
            },
          },
        },
      },
      include: {
        conversation: {
          select: {
            participants: {
              where: {
                user_id: userId,
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
      return null;
    }

    // Check if user is message sender or conversation leader
    const isLeader = message.conversation.participants[0]?.type === 'LEAD';
    const isSender = message.sender_id === userId;

    if (!isLeader && !isSender) {
      throw new Error('You do not have permission to delete this message');
    }

    // Soft delete the message
    const deletedMessage = await this.prisma.message.update({
      where: {
        id: messageId,
      },
      data: {
        deleted_at: new Date(),
        deleted_messages: {
          create: {
            user_id: userId,
          },
        },
      },
      include: {
        attachments: true,
      },
    });

    return this.mapToEntity(deletedMessage);
  }

  async getMessagesByConversation(
    conversationId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Message>> {
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
      data: messages.map(message => this.mapToEntity(message)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMessage(messageId: number): Promise<Message | null> {
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
      return null;
    }

    return this.mapToEntity(message);
  }

  async updateMessage(messageId: number, messageData: Partial<Message>): Promise<Message> {
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: messageData.content,
        message_status: messageData.status,
        deleted_at: messageData.deletedAt,
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

    return this.mapToEntity(updatedMessage);
  }

  async validateConversationAccess(userId: number, conversationId: number): Promise<boolean> {
    const participant = await this.prisma.participant.findFirst({
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

  private mapToEntity(data: any): Message {
    const message = new Message();
    message.id = data.id;
    message.guid = data.guid;
    message.conversationId = data.conversation_id;
    message.senderId = data.sender_id;
    message.messageType = data.message_type;
    message.content = data.content;
    message.callType = data.call_type;
    message.callStatus = data.call_status;
    message.status = data.message_status;
    message.createdAt = data.created_at;
    message.deletedAt = data.deleted_at;
    
    if (data.attachments) {
      message.attachments = data.attachments.map(att => {
        const attachment = new MessageAttachment();
        attachment.id = att.id;
        attachment.messageId = att.message_id;
        attachment.thumbUrl = att.thumb_url;
        attachment.fileUrl = att.file_url;
        return attachment;
      });
    }

    return message;
  }
} 
