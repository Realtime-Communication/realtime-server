import { ApiProperty } from '@nestjs/swagger';

export class FriendStoriesDto {
  @ApiProperty({ description: 'ID of the story' })
  id: number;

  @ApiProperty({ description: 'Content of the story' })
  content: string;

  @ApiProperty({ description: 'Timestamp when the story was created' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when the story will expire' })
  expiresAt: Date;

  @ApiProperty({ description: 'Number of likes on the story' })
  likeCount: number;

  @ApiProperty({ description: 'Number of comments on the story' })
  commentCount: number;
}
