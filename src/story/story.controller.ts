import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { StoryService } from './story.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { AccountRequest, TAccountRequest } from 'src/decorators/account-request.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { StoryVM } from './vm/story.vm';
import { FriendStoriesDto } from './dto/friend-stories.dto';
import { CommentPaginationDto } from './dto/comment-pagination.dto';

@ApiTags('stories')
@Controller('story')
export class StoryController {
  
  constructor(private readonly storyService: StoryService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new story' })
  @ApiResponse({ status: 201, description: 'Story created successfully', type: StoryVM })
  create(@Body() createStoryDto: CreateStoryDto, @AccountRequest() account: TAccountRequest) {
    return this.storyService.create(createStoryDto, account.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active stories' })
  @ApiResponse({ status: 200, description: 'Return all active stories', type: [StoryVM] })
  findAll() {
    return this.storyService.findAll();
  }

  @Get('friend/:friendId')
  @ApiOperation({ summary: "Get a friend's latest stories" })
  @ApiResponse({ status: 200, description: "Returns friend's latest 5 stories with like and comment counts", type: [FriendStoriesDto] })
  @ApiResponse({ status: 403, description: 'Forbidden. Users can only view stories of their friends' })
  @ApiResponse({ status: 404, description: 'Friend not found or not a friend' })
  async getFriendStories(
    @Param('friendId') friendId: string,
    @AccountRequest() account: TAccountRequest
  ) {
    return this.storyService.getFriendStories(account.id, +friendId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a story by id' })
  @ApiResponse({ status: 200, description: 'Return the story', type: StoryVM })
  findOne(@Param('id') id: string) {
    return this.storyService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a story' })
  @ApiResponse({ status: 200, description: 'Story updated successfully', type: StoryVM })
  update(
    @Param('id') id: string,
    @Body() updateStoryDto: UpdateStoryDto,
    @AccountRequest() account: TAccountRequest,
  ) {
    return this.storyService.update(+id, updateStoryDto, account.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a story' })
  @ApiResponse({ status: 200, description: 'Story deleted successfully' })
  remove(@Param('id') id: string, @AccountRequest() account: TAccountRequest) {
    return this.storyService.remove(+id, account.id);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like a story' })
  @ApiResponse({ status: 200, description: 'Story liked successfully' })
  likeStory(@Param('id') id: string, @AccountRequest() account: TAccountRequest) {
    return this.storyService.likeStory(+id, account.id);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Unlike a story' })
  @ApiResponse({ status: 200, description: 'Story unliked successfully' })
  unlikeStory(@Param('id') id: string, @AccountRequest() account: TAccountRequest) {
    return this.storyService.unlikeStory(+id, account.id);
  }

  @Post(':id/comment')
  @ApiOperation({ summary: 'Add a comment to a story' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @AccountRequest() account: TAccountRequest,
  ) {
    return this.storyService.addComment(+id, account.id, content);
  }

  @Delete('comment/:id')
  @ApiOperation({ summary: 'Remove a comment from a story' })
  @ApiResponse({ status: 200, description: 'Comment removed successfully' })
  removeComment(@Param('id') id: string, @AccountRequest() account: TAccountRequest) {
    return this.storyService.removeComment(+id, account.id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get paginated comments for a story' })
  @ApiResponse({ status: 200, description: 'Returns paginated comments for the story' })
  @ApiResponse({ status: 404, description: 'Story not found' })
  getComments(
    @Param('id') id: string,
    @Query() pagination: CommentPaginationDto,
  ) {
    return this.storyService.getComments({
      ...pagination,
      storyId: +id,
    });
  }
}
