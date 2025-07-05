import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { CallType, CallStatus } from '@prisma/client';
import { ConversationType } from 'src/groups/model/conversation.vm';

export class CallDto {
  @IsInt()
  @IsNotEmpty()
  conversationId: number;

  @IsEnum(ConversationType)
  @IsNotEmpty()
  conversationType: ConversationType;

  @IsEnum(CallType)
  @IsOptional()
  callType?: CallType;

  @IsString()
  @IsOptional()
  signalData?: string;
}

export class CallResponseDto extends CallDto {
  @IsEnum(CallStatus)
  @IsNotEmpty()
  status: CallStatus;
}

export class TypingDto {
  @IsInt()
  @IsNotEmpty()
  conversationId: number;

  @IsEnum(ConversationType)
  @IsNotEmpty()
  conversationType: ConversationType;

  @IsOptional()
  isTyping?: boolean = true;
} 
