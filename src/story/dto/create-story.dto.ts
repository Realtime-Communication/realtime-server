import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoryDto {
  @ApiProperty({ description: 'Content of the story' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Expiration date of the story' })
  @IsDateString()
  @IsNotEmpty()
  expires_at: Date;
}
