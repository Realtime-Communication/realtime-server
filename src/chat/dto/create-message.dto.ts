import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @IsInt()
  @IsNotEmpty()
  conversation_id: number;

  @IsInt()
  @IsNotEmpty()
  sender_id: number;

  @IsEnum(MessageType)
  @IsNotEmpty()
  message_type: MessageType;

  @IsString()
  @IsOptional()
  message?: string;

  @IsOptional()
  attachments?: {
    thumb_url: string;
    file_url: string;
  }[];
}
