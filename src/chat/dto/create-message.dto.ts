import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import {
  CallStatus,
  CallType,
  MessageStatus,
  MessageType,
} from '@prisma/client';
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { ConversationType, ConversationVm } from 'src/groups/model/conversation.vm';
import { BaseDto } from './base.dto';
import { Type } from 'class-transformer';

export enum TargetType {
  ROOM,
  FRIEND,
}

export class AttachmentDto {
  @IsString()
  @IsOptional()
  thumbUrl?: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}

export class MessageDto extends BaseDto {
  @IsInt()
  @IsNotEmpty()
  conversationId: number;

  @IsUUID()
  @IsOptional()
  guid?: string;

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
  status?: MessageStatus = 'SENT';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];

  // Runtime properties
  timestamp?: Date;
  user?: TAccountRequest;
}

export class CallDto extends BaseDto {
  @IsEnum(CallType)
  @IsOptional()
  callType?: CallType;

  @IsString()
  @IsOptional()
  signalData?: string;

  // Runtime properties
  user?: TAccountRequest;
  callerInfomation?: TAccountRequest;
}

export class CallResponseDto extends CallDto {
  @IsEnum(CallStatus)
  @IsNotEmpty()
  status: CallStatus;
}

export class DeleteMessageDto extends BaseDto {
  @IsNumber()
  @IsNotEmpty()
  messageId: number;
}
