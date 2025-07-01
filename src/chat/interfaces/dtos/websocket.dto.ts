import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ConversationType } from 'src/groups/model/conversation.vm';
import { 
  MessageType, 
  CallType, 
  CallStatus, 
  MessageStatus 
} from '@prisma/client';

export class BaseWebSocketDto {
  @IsInt()
  @IsNotEmpty()
  conversationId: number;

  @IsEnum(ConversationType)
  @IsNotEmpty()
  conversationType: ConversationType;
}

export class MessageWebSocketDto extends BaseWebSocketDto {
  @IsUUID()
  @IsOptional()
  guid?: string;

  @IsEnum(MessageType)
  @IsNotEmpty()
  messageType: MessageType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(CallType)
  @IsOptional()
  callType?: CallType;

  @IsEnum(CallStatus)
  @IsOptional()
  callStatus?: CallStatus;

  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus = 'SENT';

  // Attachments would need a more complex validator
  @IsOptional()
  attachments?: Array<{
    thumbUrl?: string;
    fileUrl: string;
  }>;
}

export class CallWebSocketDto extends BaseWebSocketDto {
  @IsEnum(CallType)
  @IsOptional()
  callType?: CallType;

  @IsString()
  @IsOptional()
  signalData?: string;
}

export class TypingWebSocketDto extends BaseWebSocketDto {
  @IsOptional()
  isTyping: boolean = true;
}

export class DeleteMessageWebSocketDto extends BaseWebSocketDto {
  @IsInt()
  @IsNotEmpty()
  messageId: number;

  @IsOptional()
  deleteForEveryone: boolean = true;
}

export class JoinGroupWebSocketDto {
  @IsInt()
  @IsNotEmpty()
  groupId: number;
} 
