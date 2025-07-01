import { CallStatus, CallType, MessageStatus, MessageType } from '@prisma/client';

export class MessageAttachment {
  id?: number;
  messageId?: number;
  thumbUrl?: string;
  fileUrl: string;
}

export class Message {
  id?: number;
  guid: string;
  conversationId: number;
  senderId: number;
  messageType: MessageType;
  content?: string;
  callType?: CallType;
  callStatus?: CallStatus;
  status: MessageStatus;
  createdAt?: Date;
  deletedAt?: Date;
  attachments?: MessageAttachment[];
} 
