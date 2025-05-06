import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  CallStatus,
  CallType,
  MessageStatus,
  MessageType,
} from '@prisma/client';
import { UUID } from 'crypto';
import { UUIDTypes } from 'uuid';

export class CreateMessageDto {
  @IsInt()
  @IsNotEmpty()
  conversation_id: number;

  guid: string;

  @IsEnum(MessageType)
  @IsNotEmpty()
  message_type: MessageType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(CallType)
  @IsOptional()
  call_type?: CallType;

  @IsEnum(CallStatus)
  @IsOptional()
  callStatus?: CallStatus;

  @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus = 'sent';

  timestamp: Date;

  @IsOptional()
  attachments?: {
    thumb_url: string;
    file_url: string;
  }[];
}
