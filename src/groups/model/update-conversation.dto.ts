import { PartialType } from '@nestjs/mapped-types';
import { CreateConversationDto } from './create-conversation.dto';
import { IsString, IsOptional, IsDate } from 'class-validator';

export class UpdateConversationDto extends PartialType(CreateConversationDto) {
  id?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsDate()
  @IsOptional()
  deleted_at?: Date;

  avatarUrl: string;
}
