import { CallStatus, CallType, MessageStatus, MessageType } from '@prisma/client';

export class MessageVm {
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

  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };

  attachments?: {
    id: number;
    thumbUrl: string;
    fileUrl: string;
  }[];
}
