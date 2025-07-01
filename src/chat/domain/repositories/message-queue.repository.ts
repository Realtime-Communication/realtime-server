import { ConversationType } from 'src/groups/model/conversation.vm';

export type CallType = 'VOICE' | 'VIDEO';
export type PriorityLevel = 1 | 3 | 5 | 8 | 10;
export type EventType = 
  | 'sendMessage'
  | 'callRequest'
  | 'typing'
  | 'presence'
  | 'joinGroup'
  | 'deleteMessage';

export interface EventBase {
  eventType: EventType;
  userId: number;
  socketId: string;
  timestamp: Date;
  priority?: PriorityLevel;
}

export interface MessageData {
  conversationId: number;
  conversationType: ConversationType;
  content?: string;
  messageType: string;
  attachments?: Array<{
    thumbUrl?: string;
    fileUrl: string;
  }>;
}

export interface CallData {
  conversationId: number;
  conversationType: ConversationType;
  callType: CallType;
}

export interface TypingData {
  conversationId: number;
  conversationType: ConversationType;
  isTyping: boolean;
}

export interface MessageQueueRepository {
  publishMessageEvent(userId: number, socketId: string, data: MessageData): Promise<boolean>;
  publishCallEvent(userId: number, socketId: string, data: CallData): Promise<boolean>;
  publishTypingEvent(userId: number, socketId: string, data: TypingData): Promise<boolean>;
  publishPresenceEvent(userId: number, socketId: string, data: any): Promise<boolean>;
  publishEvent(event: EventBase & { data: any }): Promise<boolean>;
  healthCheck(): Promise<boolean>;
  setupConsumer(queueName: string, processor: (event: any) => Promise<void>): Promise<void>;
} 
