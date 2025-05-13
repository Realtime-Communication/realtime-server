import { IsInt, IsNotEmpty, IsString, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ParticipantDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  type: 'LEAD' | 'MEMBER';
}

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  creatorId?: number;

  channelId?: number;

  avatarUrl?: string

  @IsArray()
  @ArrayMinSize(2, { message: 'At least one participant is required besides the creator' })
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];
}
