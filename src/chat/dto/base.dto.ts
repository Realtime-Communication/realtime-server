import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { ConversationType } from 'src/groups/model/conversation.vm';

export class BaseDto {
  @IsNumber()
  @IsNotEmpty()
  conversationId: number;

  @IsEnum(ConversationType)
  @IsNotEmpty()
  conversationType: ConversationType;
} 
