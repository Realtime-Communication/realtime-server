import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../interfaces/authenticated-socket.interface';
import { BaseHandler } from './base.handler';
import { MessageDto, DeleteMessageDto } from '../dto/create-message.dto';
import { ChatService } from '../message.service';
import { WebSocketSecurityService } from '../websocket-security.service';
import { CacheManager } from '../cache.service';
import * as crypto from 'crypto';

@Injectable()
export class MessageHandler extends BaseHandler {
  constructor(
    server: Server,
    private readonly chatService: ChatService,
    private readonly securityService: WebSocketSecurityService,
    private readonly cacheManager: CacheManager
  ) {
    super();
    this.setServer(server);
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(
    client: AuthenticatedSocket,
    messageDto: MessageDto
  ): Promise<void> {
    try {
      // Check rate limiting first
      if (!this.securityService.checkMessageRateLimit(client.account.id)) {
        this.emitError(client, 'sendMessage', 'Rate limit exceeded. Please slow down.');
        return;
      }

      // Validate conversation access
      const hasAccess = await this.chatService.validateConversationAccess(
        client.account.id,
        messageDto.conversationId
      );

      if (!hasAccess) {
        this.emitError(client, 'sendMessage', 'You do not have access to this conversation');
        return;
      }

      // Validate and filter content
      if (messageDto.content) {
        // Check for spam
        if (this.securityService.isSpamContent(messageDto.content)) {
          this.emitError(client, 'sendMessage', 'Message blocked: Spam detected');
          this.securityService.markSuspiciousActivity(client.handshake.address);
          return;
        }

        // Filter content for security
        messageDto.content = this.securityService.filterContent(messageDto.content);

        // Check if content is empty after filtering
        if (!messageDto.content.trim()) {
          this.emitError(client, 'sendMessage', 'Message content is empty or invalid');
          return;
        }
      }

      // Validate attachments if present
      if (messageDto.attachments && messageDto.attachments.length > 0) {
        const maxAttachments = 5;
        if (messageDto.attachments.length > maxAttachments) {
          this.emitError(client, 'sendMessage', `Maximum ${maxAttachments} attachments allowed`);
          return;
        }

        // Validate each attachment URL format
        for (const attachment of messageDto.attachments) {
          if (!this.isValidUrl(attachment.fileUrl)) {
            this.emitError(client, 'sendMessage', 'Invalid attachment URL format');
            return;
          }
        }
      }

      // Set metadata
      messageDto.timestamp = new Date();
      messageDto.guid = crypto.randomUUID();
      messageDto.user = client.account;

      // Save message to database
      const savedMessage = await this.chatService.saveMessage(client.account, messageDto);
      
      if (!savedMessage) {
        this.emitError(client, 'sendMessage', 'Failed to save message');
        return;
      }

      // Emit to target rooms
      await this.emitToRooms(client, messageDto, 'messageComing', savedMessage);
      await this.emitToRooms(client, messageDto, 'loadLastMessage', {});

      // Update conversation last activity
      await this.updateConversationActivity(messageDto.conversationId);

      // Log successful message
      this.logger.log(
        `Message sent from user ${client.account.id} to conversation ${messageDto.conversationId}`
      );
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`, error.stack);
      this.emitError(client, 'sendMessage', 'Internal server error');
    }
  }

  /**
   * Handle typing indicator
   */
  async handleTyping(
    client: AuthenticatedSocket,
    messageDto: MessageDto
  ): Promise<void> {
    try {
      // Validate conversation access
      const hasAccess = await this.chatService.validateConversationAccess(
        client.account.id,
        messageDto.conversationId
      );

      if (!hasAccess) {
        this.emitError(client, 'typing', 'You do not have access to this conversation');
        return;
      }

      // Add user info
      const typingData = {
        user: {
          id: client.account.id,
          firstName: client.account.firstName,
          lastName: client.account.lastName,
        },
        conversationId: messageDto.conversationId,
        conversationType: messageDto.conversationType,
        timestamp: new Date(),
      };

      // Emit with timeout to other users only
      const rooms = this.getTargetRooms(client, messageDto);
      this.server
        .to(rooms)
        .except(client.id)
        .timeout(3000)
        .emit('typing', typingData);
    } catch (error) {
      this.logger.error(`Error handling typing: ${error.message}`);
      this.emitError(client, 'typing', 'Failed to send typing indicator');
    }
  }

  /**
   * Handle message deletion
   */
  async handleDeleteMessage(
    client: AuthenticatedSocket,
    deleteDto: DeleteMessageDto
  ): Promise<void> {
    try {
      // Validate conversation access
      const hasAccess = await this.chatService.validateConversationAccess(
        client.account.id,
        deleteDto.conversationId
      );

      if (!hasAccess) {
        this.emitError(client, 'deleteMessage', 'You do not have access to this conversation');
        return;
      }

      // Delete from database
      const deleted = await this.chatService.deleteMessage(
        client.account,
        deleteDto.messageId
      );

      if (!deleted) {
        this.emitError(client, 'deleteMessage', 'Failed to delete message or message not found');
        return;
      }

      // Notify clients
      await this.emitToRooms(client, deleteDto, 'delete_message', {
        messageId: deleteDto.messageId,
        deletedBy: {
          id: client.account.id,
          firstName: client.account.firstName,
          lastName: client.account.lastName,
        },
        deletedAt: new Date(),
        conversationId: deleteDto.conversationId,
      });

      this.logger.log(
        `Message ${deleteDto.messageId} deleted by user ${client.account.id}`
      );
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`, error.stack);
      this.emitError(client, 'deleteMessage', 'Internal server error');
    }
  }

  /**
   * Handle message read status update
   */
  async handleMessageRead(
    client: AuthenticatedSocket,
    data: { messageId: number; conversationId: number; conversationType: string }
  ): Promise<void> {
    try {
      // Validate conversation access
      const hasAccess = await this.chatService.validateConversationAccess(
        client.account.id,
        data.conversationId
      );

      if (!hasAccess) {
        return;
      }

      // Update message status in database (if needed)
      // For now, just emit read receipt
      const readData = {
        messageId: data.messageId,
        readBy: {
          id: client.account.id,
          firstName: client.account.firstName,
          lastName: client.account.lastName,
        },
        readAt: new Date(),
        conversationId: data.conversationId,
      };

      // Create a base DTO for room targeting
      const baseDto = {
        conversationId: data.conversationId,
        conversationType: data.conversationType as any,
      };

      await this.emitToRooms(client, baseDto, 'message_read', readData, true);
    } catch (error) {
      this.logger.error(`Error handling message read: ${error.message}`);
    }
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update conversation last activity timestamp
   */
  private async updateConversationActivity(conversationId: number): Promise<void> {
    try {
      // This could be implemented in the chat service
      // For now, we'll just log it
      this.logger.debug(`Updating activity for conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to update conversation activity: ${error.message}`);
    }
  }
} 
