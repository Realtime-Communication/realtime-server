import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsInt()
  @IsNotEmpty()
  creator_id: number;

  @IsInt()
  @IsNotEmpty()
  channel_id: number;
}
