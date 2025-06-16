import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateStoryDto } from './dto/update-story.dto';
import { StoryCommentVM, StoryVM } from './vm/story.vm';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { FriendStoriesDto } from './dto/friend-stories.dto';
import { CommentPaginationDto } from './dto/comment-pagination.dto';

@Injectable()
export class StoryService {
  constructor(private prisma: PrismaService) {}

  async create(
    createStoryDto: CreateStoryDto,
    userId: number,
  ): Promise<StoryVM> {
    const story = await this.prisma.story.create({
      data: {
        ...createStoryDto,
        user_id: userId,
      },
      include: {
        likes: true,
        comments: true,
      },
    });

    return story as StoryVM;
  }

  async findAll(): Promise<StoryVM[]> {
    const stories = await this.prisma.story.findMany({
      where: {
        expires_at: {
          gt: new Date(),
        },
      },
      include: {
        likes: true,
        comments: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return stories as StoryVM[];
  }

  async findOne(id: number): Promise<StoryVM> {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: {
        likes: true,
        comments: true,
      },
    });

    if (!story) {
      throw new NotFoundException(`Story with ID ${id} not found`);
    }

    return story as StoryVM;
  }

  async update(
    id: number,
    updateStoryDto: UpdateStoryDto,
    userId: number,
  ): Promise<StoryVM> {
    const story = await this.prisma.story.findUnique({
      where: { id },
    });

    if (!story) {
      throw new NotFoundException(`Story with ID ${id} not found`);
    }

    if (story.user_id !== userId) {
      throw new NotFoundException(
        'You are not authorized to update this story',
      );
    }

    const updatedStory = await this.prisma.story.update({
      where: { id },
      data: updateStoryDto,
      include: {
        likes: true,
        comments: true,
      },
    });

    return updatedStory as StoryVM;
  }

  async remove(id: number, userId: number): Promise<void> {
    const story = await this.prisma.story.findUnique({
      where: { id },
    });

    if (!story) {
      throw new NotFoundException(`Story with ID ${id} not found`);
    }

    if (story.user_id !== userId) {
      throw new NotFoundException(
        'You are not authorized to delete this story',
      );
    }

    await this.prisma.story.delete({
      where: { id },
    });
  }

  async likeStory(storyId: number, userId: number): Promise<void> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException(`Story with ID ${storyId} not found`);
    }

    await this.prisma.storyLike.create({
      data: {
        story_id: storyId,
        user_id: userId,
      },
    });
  }

  async unlikeStory(storyId: number, userId: number): Promise<void> {
    await this.prisma.storyLike.deleteMany({
      where: {
        story_id: storyId,
        user_id: userId,
      },
    });
  }

  async addComment(
    storyId: number,
    userId: number,
    content: string,
  ): Promise<StoryCommentVM> {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException(`Story with ID ${storyId} not found`);
    }

    const comment = await this.prisma.storyComment.create({
      data: {
        story_id: storyId,
        user_id: userId,
        content,
      },
    });

    return comment as StoryCommentVM;
  }

  async removeComment(commentId: number, userId: number): Promise<void> {
    const comment = await this.prisma.storyComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.user_id !== userId) {
      throw new NotFoundException(
        'You are not authorized to delete this comment',
      );
    }

    await this.prisma.storyComment.delete({
      where: { id: commentId },
    });
  }

  async getFriendStories(userId: number, friendId: number): Promise<FriendStoriesDto[]> {
    // Check if users are friends
    const friendship = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { requester_id: userId, receiver_id: friendId, status: 'ACCEPTED' },
          { requester_id: friendId, receiver_id: userId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!friendship) {
      throw new ForbiddenException('You can only view stories of your friends');
    }

    // Get the latest 5 stories from the friend
    const stories = await this.prisma.story.findMany({
      where: {
        user_id: friendId,
        expires_at: {
          gt: new Date(),
        },
      },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 5,
    });

    // Map to the DTO
    return stories.map((story) => ({
      id: story.id,
      content: story.content,
      createdAt: story.created_at,
      expiresAt: story.expires_at,
      likeCount: story._count.likes,
      commentCount: story._count.comments,
    }));
  }

  async getComments(pagination: CommentPaginationDto): Promise<{ items: StoryCommentVM[]; total: number }> {
    const { storyId, page = 1, size = 10, order = 'desc' } = pagination;

    // Verify story exists
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException(`Story with ID ${storyId} not found`);
    }

    const [items, total] = await Promise.all([
      this.prisma.storyComment.findMany({
        where: {
          story_id: storyId,
        },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: order as 'asc' | 'desc',
        },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.storyComment.count({
        where: {
          story_id: storyId,
        },
      }),
    ]);

    return {
      items: items as StoryCommentVM[],
      total,
    };
  }
}
