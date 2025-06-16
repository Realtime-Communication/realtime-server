import { IsOptional, IsString } from 'class-validator';

export class ConversationFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  creator_id?: string;
} 
