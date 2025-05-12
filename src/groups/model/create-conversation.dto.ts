import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @IsNotEmpty()
  creatorId: number;

  @IsInt()
  @IsNotEmpty()
  channelId: number;
}
