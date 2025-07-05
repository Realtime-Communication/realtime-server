import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsUUID,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CallStatus,
  CallType,
  MessageStatus,
  MessageType,
} from '@prisma/client';
import { ConversationType } from 'src/groups/model/conversation.vm';

export class AttachmentDto {
  @IsString()
  @IsOptional()
  thumbUrl?: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}

export class CreateMessageDto {
  @IsInt()
  @IsNotEmpty()
  conversationId: number;

  @IsEnum(ConversationType)
  @IsNotEmpty()
  conversationType: ConversationType;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus;

  @IsDate()
  @IsOptional()
  deletedAt?: Date;
}

export class DeleteMessageDto {
  @IsInt()
  @IsNotEmpty()
  messageId: number;

  @IsInt()
  @IsNotEmpty()
  conversationId: number;

  @IsEnum(ConversationType)
  @IsNotEmpty()
  conversationType: ConversationType;

  @IsOptional()
  deleteForEveryone?: boolean = true;
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
  callType?: CallType;
  callStatus?: CallStatus;
  status: MessageStatus;
  attachments?: {
    id: number;
    thumbUrl?: string;
    fileUrl: string;
  }[];
  sender?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
} 
