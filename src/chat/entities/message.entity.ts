import { CallStatus, CallType, MessageStatus, MessageType } from '@prisma/client';

export interface MessageAttachment {
  id?: number;
  messageId?: number;
  thumbUrl?: string;
  fileUrl: string;
}

export interface Message {
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
  sender?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface UserPresence {
  userId: number;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen: Date;
  socketId?: string;
  activity?: string;
} 
