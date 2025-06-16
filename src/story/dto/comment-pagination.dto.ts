import { ApiProperty } from '@nestjs/swagger';
import { Pageable } from 'src/common/pagination/pageable.dto';

export class CommentPaginationDto extends Pageable {
  @ApiProperty({ description: 'Story ID to get comments for', required: true })
  storyId: number;
} 
