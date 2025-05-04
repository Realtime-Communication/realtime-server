import { IsOptional, IsString, IsDate } from 'class-validator';

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
  message?: string;

  @IsDate()
  @IsOptional()
  deleted_at?: Date;
}
