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
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { ConversationType } from 'src/groups/model/conversation.vm';

export enum TargetType {
  ROOM,
  FRIEND,
}

export class MessageDto {
  @IsInt()
  @IsNotEmpty()
  conversationId: number;

  guid: string;

  @IsNotEmpty()
  conversationType: ConversationType;

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
  status?: MessageStatus = 'sent';

  timestamp: Date;

  @IsOptional()
  attachments?: {
    thumbUrl: string;
    fileUrl: string;
  }[];

  user: TAccountRequest;
}

export class CallDto extends MessageDto {
  // @IsInt()
  // @IsNotEmpty()
  // from: number;

  @IsString()
  @IsNotEmpty()
  signalData: string;
}

export class CallResponseDto extends MessageDto {
  @IsString()
  @IsNotEmpty()
  signal: string;
}
