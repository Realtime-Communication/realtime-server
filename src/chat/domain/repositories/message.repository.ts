import { Message } from '../entities/message.entity';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';

export interface MessageRepository {
  saveMessage(message: Message): Promise<Message>;
  deleteMessage(messageId: number, userId: number): Promise<Message | null>;
  getMessagesByConversation(
    conversationId: number,
    page?: number,
    limit?: number
  ): Promise<PaginatedResponse<Message>>;
  getMessage(messageId: number): Promise<Message | null>;
  updateMessage(messageId: number, message: Partial<Message>): Promise<Message>;
  validateConversationAccess(userId: number, conversationId: number): Promise<boolean>;
} 
