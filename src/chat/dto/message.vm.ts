import { CallStatus, CallType, MessageStatus, MessageType } from '@prisma/client';

export class MessageVm {
  id: number;
  guid: string;
  conversation_id: number;
  sender_id: number;
  message_type: MessageType;
  content: string;
  created_at: Date;
  deleted_at?: Date;
  call_type: CallType;
  callStatus: CallStatus;
  status: MessageStatus;

  user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };

  attachments?: {
    id: number;
    thumb_url: string;
    file_url: string;
  }[];
}
