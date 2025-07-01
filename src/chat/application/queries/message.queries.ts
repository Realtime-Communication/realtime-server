import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository } from '../../domain/repositories/message.repository';
import { MessageResponseDto } from '../dtos/message.dto';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { Message } from '../../domain/entities/message.entity';

@Injectable()
export class MessageQueryService {
  constructor(
    private readonly messageRepository: MessageRepository
  ) {}

  async getMessagesByConversation(
    userId: number,
    conversationId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<MessageResponseDto>> {
    // Verify user has access to the conversation
    const hasAccess = await this.messageRepository.validateConversationAccess(
      userId,
      conversationId
    );

    if (!hasAccess) {
      throw new Error('You do not have access to this conversation');
    }

    const result = await this.messageRepository.getMessagesByConversation(
      conversationId,
      page,
      limit
    );

    return {
      data: result.data.map(message => this.mapToResponseDto(message)),
      meta: result.meta
    };
  }

  async getMessage(userId: number, messageId: number): Promise<MessageResponseDto> {
    const message = await this.messageRepository.getMessage(messageId);
    
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to the conversation
    const hasAccess = await this.messageRepository.validateConversationAccess(
      userId, 
      message.conversationId
    );

    if (!hasAccess) {
      throw new Error('You do not have access to this message');
    }

    return this.mapToResponseDto(message);
  }

  async validateConversationAccess(userId: number, conversationId: number): Promise<boolean> {
    return this.messageRepository.validateConversationAccess(userId, conversationId);
  }

  private mapToResponseDto(message: Message): MessageResponseDto {
    return {
      id: message.id,
      guid: message.guid,
      conversationId: message.conversationId,
      senderId: message.senderId,
      messageType: message.messageType,
      content: message.content || '',
      createdAt: message.createdAt,
      deletedAt: message.deletedAt,
      callType: message.callType,
      callStatus: message.callStatus,
      status: message.status,
      attachments: message.attachments?.map(att => ({
        id: att.id,
        thumbUrl: att.thumbUrl,
        fileUrl: att.fileUrl
      }))
    };
  }
} 
