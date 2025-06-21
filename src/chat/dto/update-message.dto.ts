import { IsOptional, IsString, IsDate, IsEnum } from 'class-validator';
import { MessageStatus } from '@prisma/client';

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
   content?: string;



   @IsEnum(MessageStatus)
  @IsOptional()
  status?: MessageStatus;
  @IsDate()
  @IsOptional()
  deleted_at?: Date;
}
