import { Injectable } from '@nestjs/common';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { CreateConversationDto } from './model/create-conversation.dto';
import { Conversation, Message, ParticipantType } from '@prisma/client';
import { QueryMessageDto } from './model/query-message.dto';
import { PagedResponse } from 'src/common/pagination/paged.vm';
import { MessageVm } from 'src/chat/dto/message.vm';
import { Pageable } from 'src/common/pagination/pageable.dto';
import { ConversationVm } from './model/conversation.vm';
import { ConversationActionDto } from './model/action-conversation.dto';

@Injectable()
export class ConversationService {
  constructor(private readonly prismaService: PrismaService) {}

  async createConversation(
    createConversationDto: CreateConversationDto,
    account: TAccountRequest,
  ) {
    this.validateCreateConversationRequest(createConversationDto, account);
    return await this.prismaService.conversation.create({
      data: {
        ...createConversationDto,
        participants: {
          create: {
            type: ParticipantType.member,
            user_id: account.id,
          },
        },
      },
      include: {
        participants: true,
      },
    });
  }

  async getConversationMessages(
    account: TAccountRequest,
    query: QueryMessageDto,
  ): Promise<PagedResponse<MessageVm>> {
    const [messages, total] = await Promise.all([
      this.prismaService.message.findMany({
        where: {
          conversation_id: query.conversationId,
          deleted_at: null,
          conversation: {
            participants: {
              some: {
                user_id: account.id,
              },
            },
          },
          ...(query.cursor && {
            created_at: {
              lt: new Date(query.cursor),
            },
          }),
        },
        take: query.limit,
        orderBy: {
          created_at: 'desc',
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
          attachments: true,
        },
      }),
      this.prismaService.message.count({
        where: {
          conversation_id: query.conversationId,
          deleted_at: null,
          conversation: {
            participants: {
              some: {
                user_id: account.id,
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / query.limit);
    const nextCursor =
      messages.length > 0
        ? messages[messages.length - 1].created_at.getTime()
        : null;

    return {
      page: query.page,
      result: messages,
      size: query.limit,
      totalPage: totalPages,
      totalElement: total,
      cursor: nextCursor,
    };
  }

  async getConversationDetail(account: TAccountRequest, id: number) {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id,
        deleted_at: null,
        participants: {
          some: {
            user_id: account.id,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                is_active: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return conversation;
  }

  async getConversations(
    account: TAccountRequest,
    pageable: Pageable,
  ): Promise<PagedResponse<ConversationVm>> {
    const [conversations, total] = await Promise.all([
      this.prismaService.conversation.findMany({
        where: {
          deleted_at: null,
          participants: {
            some: {
              user_id: account.id,
            },
          },
          ...(pageable.cursor && {
            created_at: {
              lt: new Date(pageable.cursor),
            },
          }),
          ...(pageable.search && {
            title: {
              contains: pageable.search,
              mode: 'insensitive',
            },
          }),
        },
        take: pageable.limit,
        orderBy: {
          updated_at: 'desc',
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                  is_active: true,
                },
              },
            },
          },
          messages: {
            where: {
              deleted_at: null,
            },
            orderBy: {
              created_at: 'desc',
            },
            take: 1,
          },
        },
      }),
      this.prismaService.conversation.count({
        where: {
          deleted_at: null,
          participants: {
            some: {
              user_id: account.id,
            },
          },
          ...(pageable.search && {
            title: {
              contains: pageable.search,
              mode: 'insensitive',
            },
          }),
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageable.limit);
    const nextCursor =
      conversations.length > 0
        ? conversations[conversations.length - 1].created_at.getTime()
        : null;

    return {
      page: pageable.page,
      size: pageable.limit,
      totalPage: totalPages,
      totalElement: total,
      cursor: nextCursor,
      result: conversations,
    };
  }

  async kickParticipant(
    account: TAccountRequest,
    conversationAction: ConversationActionDto,
  ) {
    // Check if conversation exists and user has permission
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: conversationAction.conversationId,
        deleted_at: null,
        participants: {
          some: {
            user_id: account.id,
            type: ParticipantType.lead,
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new Error(
        "Conversation not found or you don't have permission to kick participants",
      );
    }

    // Check if target user exists in conversation
    const targetParticipant = conversation.participants.find(
      (p) => p.user_id === conversationAction.targetUserId,
    );

    if (!targetParticipant) {
      throw new Error('Target user is not a participant in this conversation');
    }

    // Prevent kicking conversation creator or self
    if (targetParticipant.type === ParticipantType.lead) {
      throw new Error('Cannot kick the conversation creator');
    }

    // Remove participant
    await this.prismaService.participant.delete({
      where: {
        id: targetParticipant.id,
      },
    });

    return {
      success: true,
      message: 'Participant has been removed from the conversation',
    };
  }

  async addParticipant(
    account: TAccountRequest,
    conversationAction: ConversationActionDto,
  ) {
    // Check if conversation exists and user has permission
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: conversationAction.conversationId,
        deleted_at: null,
        participants: {
          some: {
            user_id: account.id,
            type: ParticipantType.lead,
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new Error(
        "Conversation not found or you don't have permission to add participants",
      );
    }

    // Check if target user is already in conversation
    const existingParticipant = conversation.participants.find(
      (p) => p.user_id === conversationAction.targetUserId,
    );

    if (existingParticipant) {
      throw new Error('User is already a participant in this conversation');
    }

    // Check if target user exists
    const targetUser = await this.prismaService.user.findFirst({
      where: {
        id: conversationAction.targetUserId,
        is_active: true,
        is_blocked: false,
      },
    });

    if (!targetUser) {
      throw new Error('Target user not found or is not available');
    }

    // Add new participant
    const newParticipant = await this.prismaService.participant.create({
      data: {
        conversation_id: conversationAction.conversationId,
        user_id: conversationAction.targetUserId,
        type: ParticipantType.member,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_active: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Participant has been added to the conversation',
      participant: newParticipant,
    };
  }

  async leaveConversation(
    account: TAccountRequest,
    actionDto: ConversationActionDto,
  ) {
    // Check if conversation exists and user is a participant
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: actionDto.conversationId,
        deleted_at: null,
        participants: {
          some: {
            user_id: account.id,
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or you are not a participant');
    }

    const participant = conversation.participants.find(
      (p) => p.user_id === account.id,
    );

    if (!participant) {
      throw new Error('You are not a participant in this conversation');
    }

    // Check if user is the leader and if there are other participants
    const isLeader = participant.type === ParticipantType.lead;
    const otherParticipants = conversation.participants.filter(
      (p) => p.user_id !== account.id,
    );

    if (isLeader && otherParticipants.length > 0) {
      // Find the earliest joined member to promote as new leader
      const newLeader = otherParticipants.reduce((earliest, current) =>
        current.created_at < earliest.created_at ? current : earliest,
      );

      // Promote the new leader
      await this.prismaService.participant.update({
        where: { id: newLeader.id },
        data: { type: ParticipantType.lead },
      });
    }

    // Remove the participant
    await this.prismaService.participant.delete({
      where: { id: participant.id },
    });

    // If no participants left, soft delete the conversation
    if (otherParticipants.length === 0) {
      await this.prismaService.conversation.update({
        where: { id: actionDto.conversationId },
        data: { deleted_at: new Date() },
      });

      return {
        success: true,
        message:
          'You left the conversation and it was archived as you were the last participant',
      };
    }

    return {
      success: true,
      message: isLeader
        ? 'You left the conversation and leadership was transferred to another member'
        : 'You left the conversation successfully',
    };
  }

  validateCreateConversationRequest(
    createConversationDto: CreateConversationDto,
    account: TAccountRequest,
  ) {
    if (!createConversationDto.title) {
      throw new Error('Conversation title is required');
    }
    if (!account || createConversationDto.creator_id != account.id) {
      throw new Error('Valid account is required');
    }
  }
}
