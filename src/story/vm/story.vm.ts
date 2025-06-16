import { ApiProperty } from '@nestjs/swagger';

export class StoryLikeVM {
  @ApiProperty()
  id: number;

  @ApiProperty()
  user_id: number;

  @ApiProperty()
  created_at: Date;
}

export class StoryCommentVM {
  @ApiProperty()
  id: number;

  @ApiProperty()
  user_id: number;

  @ApiProperty()
  content: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class StoryVM {
  @ApiProperty()
  id: number;

  @ApiProperty()
  user_id: number;

  @ApiProperty()
  content: string;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

  @ApiProperty()
  expires_at: Date;

  @ApiProperty({ type: [StoryLikeVM] })
  likes: StoryLikeVM[];

  @ApiProperty({ type: [StoryCommentVM] })
  comments: StoryCommentVM[];
}
