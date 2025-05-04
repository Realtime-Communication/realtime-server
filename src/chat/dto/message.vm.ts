import { MessageType } from '@prisma/client';

export class MessageVm {
  id: number;
  guid: string;
  conversation_id: number;
  sender_id: number;
  message_type: MessageType;
  message: string;
  created_at: Date;
  attachments?: AttachmentVm[];
}

export class AttachmentVm {
  id: number;
  thumb_url: string;
  file_url: string;
}
