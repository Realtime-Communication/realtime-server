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
import { ConversationType, ConversationVm } from 'src/groups/model/conversation.vm';

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

  @IsNotEmpty()
  messageType: MessageType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  callType?: CallType;

  @IsOptional()
  callStatus?: CallStatus;

  @IsOptional()
  status?: MessageStatus = 'SENT';

  timestamp?: Date;

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
  conversation?: ConversationVm;

  callerInfomation: TAccountRequest;

  @IsString()
  @IsNotEmpty()
  signal?: string;
}

export class CallResponseDto extends MessageDto {
  @IsString()
  @IsNotEmpty()
  signal?: string;

  conversation?: ConversationVm;
}
