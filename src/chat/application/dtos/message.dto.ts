import { CallStatus, CallType, MessageStatus, MessageType } from '@prisma/client';
import { ConversationType } from 'src/groups/model/conversation.vm';

export class MessageAttachmentDto {
  thumbUrl?: string;
  fileUrl: string;
}

export class MessageDto {
  guid?: string;
  conversationId: number;
  conversationType: ConversationType;
  messageType: MessageType;
  content?: string;
  callType?: CallType;
  callStatus?: CallStatus;
  status?: MessageStatus;
  attachments?: MessageAttachmentDto[];
}

export class CallDto {
  conversationId: number;
  conversationType: ConversationType;
  callType?: CallType;
  signalData?: string;
}

export class DeleteMessageDto {
  messageId: number;
  conversationId: number;
  conversationType: ConversationType;
  deleteForEveryone: boolean;
}

export class UpdateMessageDto {
  content?: string;
  status?: MessageStatus;
  deleted_at?: Date;
}

export class MessageResponseDto {
  id: number;
  guid: string;
  conversationId: number;
  senderId: number;
  messageType: MessageType;
  content: string;
  createdAt: Date;
  deletedAt?: Date;
  callType: CallType;
  callStatus: CallStatus;
  status: MessageStatus;
  attachments?: {
    id: number;
    thumbUrl: string;
    fileUrl: string;
  }[];
  sender?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
} 
