import { Injectable } from '@nestjs/common';
import { MessageRepository } from '../../domain/repositories/message.repository';
import { MessageDto, DeleteMessageDto, UpdateMessageDto, MessageResponseDto } from '../dtos/message.dto';
import { Message, MessageAttachment } from '../../domain/entities/message.entity';
import * as crypto from 'crypto';

@Injectable()
export class MessageCommandService {
  constructor(
    private readonly messageRepository: MessageRepository
  ) {}

  async saveMessage(userId: number, messageDto: MessageDto): Promise<MessageResponseDto> {
    // Map DTO to domain entity
    const message = new Message();
    message.guid = messageDto.guid || crypto.randomUUID();
    message.conversationId = messageDto.conversationId;
    message.senderId = userId;
    message.messageType = messageDto.messageType;
    message.content = messageDto.content || '';
    message.callType = messageDto.callType;
    message.callStatus = messageDto.callStatus;
    message.status = messageDto.status || 'SENT';
    message.attachments = messageDto.attachments?.map(attachment => {
      const messageAttachment = new MessageAttachment();
      messageAttachment.thumbUrl = attachment.thumbUrl;
      messageAttachment.fileUrl = attachment.fileUrl;
      return messageAttachment;
    });

    // Save message via repository
    const savedMessage = await this.messageRepository.saveMessage(message);
    
    // Map to response DTO
    return this.mapToResponseDto(savedMessage);
  }

  async deleteMessage(userId: number, messageId: number): Promise<MessageResponseDto | null> {
    const deletedMessage = await this.messageRepository.deleteMessage(messageId, userId);
    if (!deletedMessage) return null;
    
    return this.mapToResponseDto(deletedMessage);
  }

  async updateMessage(userId: number, messageId: number, updateDto: UpdateMessageDto): Promise<MessageResponseDto> {
    // First verify the message belongs to the user
    const message = await this.messageRepository.getMessage(messageId);
    if (!message || message.senderId !== userId) {
      throw new Error('Message not found or not owned by user');
    }

    // Update the message
    const updatedMessage = await this.messageRepository.updateMessage(messageId, {
      content: updateDto.content,
      status: updateDto.status,
      deletedAt: updateDto.deleted_at
    });

    return this.mapToResponseDto(updatedMessage);
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
