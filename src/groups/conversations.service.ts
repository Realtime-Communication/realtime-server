import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateConversationDto } from './model/create-conversation.dto';
import {
  Conversation,
  Message,
  ParticipantStatus,
  ParticipantType,
} from '@prisma/client';
import { QueryMessageDto } from './model/query-message.dto';
import { PagedResponse } from 'src/common/pagination/paged.vm';
import { MessageVm } from 'src/chat/dto/message.vm';
import { Pageable } from 'src/common/pagination/pageable.dto';
import { ConversationVm, ConversationType } from './model/conversation.vm';
import { ConversationActionDto } from './model/action-conversation.dto';
import { ConversationActionType } from './model/action.enum';
import { TAccountRequest } from 'src/decorators/account-request.decorator';

@Injectable()
export class ConversationService {
  async deleteConversation(account: TAccountRequest, arg1: { targetUserId: number; conversationId: number; }) {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: arg1.conversationId,
        deleted_at: null,
        participants: {
          some: {
            user_id: account.id,
          },
        },
      },
      include: {
        participants: {
          where: {
            user_id: account.id,
            conversation_id: arg1.conversationId
          },
          take: 1
        }
      },
    });

    if (!conversation || conversation.participants.length === 0) {
      throw new NotFoundException('Conversation not found or you are not a participant');
    }

    // Get the current participant from the conversation
    const currentParticipant = conversation.participants[0];
    const isLeader = currentParticipant?.type === 'LEAD';

    if (!isLeader || !currentParticipant) {
      throw new ForbiddenException('Only conversation leaders can delete conversations');
    }

    // Delete conversation
    await this.prismaService.conversation.delete({
      where: { id: conversation.id },
    });

    return { success: true, message: 'Conversation deleted successfully' };
  }

  constructor(private readonly prismaService: PrismaService) { }

  private async validateParticipants(
    participants: { userId: number; type: 'LEAD' | 'MEMBER' }[],
    creatorId: number,
  ) {
    // Check for duplicate participants
    const userIds = new Set([creatorId]);
    for (const participant of participants) {
      if (userIds.has(participant.userId)) {
        throw new BadRequestException('Duplicate participants are not allowed');
      }
      userIds.add(participant.userId);
    }

    // Verify all participants exist and are active
    const users = await this.prismaService.user.findMany({
      where: {
        id: { in: Array.from(userIds) },
        is_active: true,
        is_blocked: false,
      },
      select: { id: true },
    });

    if (users.length !== userIds.size) {
      throw new BadRequestException(
        'One or more participants are invalid or inactive',
      );
    }
  }

  async createConversation(
    createConversationDto: CreateConversationDto,
    account: TAccountRequest,
  ) {
    this.validateCreateConversationRequest(createConversationDto, account);

    // Validate participants
    await this.validateParticipants(
      createConversationDto.participants,
      account.id,
    );

    // Create conversation with all participants
    const conversation = await this.prismaService.conversation.create({
      data: {
        title: createConversationDto.title,
        channel_id: createConversationDto.channelId,
        creator_id: account.id,
        avatar_url: createConversationDto.avatarUrl,
        participants: {
          create: [
            // Creator is always a LEAD
            {
              type: ParticipantType.LEAD,
              user_id: account.id,
              status: ParticipantStatus.VERIFIED,
            },
            // Add other participants
            ...createConversationDto.participants.map((p) => ({
              type:
                p.type === 'LEAD'
                  ? ParticipantType.LEAD
                  : ParticipantType.MEMBER,
              user_id: p.userId,
              status: ParticipantStatus.VERIFIED,
            })),
          ],
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
        messages: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return this.toConversationVm(conversation);
  }

  async getConversationMessages(
    account: TAccountRequest,
    query: QueryMessageDto,
  ): Promise<PagedResponse<MessageVm>> {
    let { conversationId, page = 1, size, order } = query;
    if (!conversationId || isNaN(conversationId)) {
      // Get the most recent conversation
      const recentConversation =
        await this.prismaService.conversation.findFirst({
          where: {
            deleted_at: null,
            participants: { some: { user_id: account.id } },
          },
          orderBy: { updated_at: 'desc' },
          select: { id: true },
        });

      if (!recentConversation) {
        throw new NotFoundException('No conversations found');
      }
      conversationId = recentConversation.id;
    }

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(size) ||
      size < 1
    ) {
      throw new BadRequestException('Page and size must be positive integers');
    }

    const skip = (page - 1) * size;

    const [messages, total] = await Promise.all([
      this.prismaService.message.findMany({
        where: {
          conversation_id: conversationId,
          deleted_at: null,
          conversation: {
            participants: {
              some: { user_id: account.id },
            },
          },
        },
        skip,
        take: size,
        orderBy: { created_at: order === 'asc' ? 'asc' : 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          attachments: {
            select: {
              id: true,
              thumb_url: true,
              file_url: true,
              created_at: true,
            },
          },
        },
      }),
      this.prismaService.message.count({
        where: {
          conversation_id: conversationId,
          deleted_at: null,
          conversation: {
            participants: {
              some: { user_id: account.id },
            },
          },
        },
      }),
    ]);

    if (!messages.length && total === 0) {
      throw new NotFoundException('No messages found for this conversation');
    }

    const mappedMessages: MessageVm[] = messages.map((message) => ({
      id: message.id,
      guid: message.guid,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      messageType: message.message_type,
      content: message.content,
      createdAt: message.created_at,
      deletedAt: message.deleted_at,
      callType: message.call_type,
      callStatus: message.call_status,
      status: message.message_status,
      user: message.sender
        ? {
          id: message.sender.id,
          firstName: message.sender.first_name,
          lastName: message.sender.last_name,
          email: message.sender.email,
        }
        : undefined,
      attachments: message.attachments?.map((att) => ({
        id: att.id,
        thumbUrl: att.thumb_url,
        fileUrl: att.file_url,
      })),
    }));

    return {
      page,
      result: mappedMessages.reverse(),
      size: size,
      totalPage: Math.ceil(total / size),
      totalElement: total,
    };
  }

  private toConversationVm(conversation: any): ConversationVm {
    return {
      id: conversation.id,
      title: conversation.title,
      creatorId: conversation.creator_id,
      channelId: conversation.channel_id,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      deletedAt: conversation.deleted_at,
      avatarUrl: conversation.avatar_url,
      conversationType:
        conversation.participants.length === 2
          ? ConversationType.FRIEND
          : ConversationType.GROUP,
      participants: conversation.participants.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        type: p.type.toLowerCase() as 'LEAD' | 'MEMBER',
        user: p.user
          ? {
            id: p.user.id,
            firstName: p.user.first_name,
            lastName: p.user.last_name,
            email: p.user.email,
            isActive: p.user.is_active,
          }
          : null,
      })),
      lastMessage: conversation.messages?.[0]
        ? {
          id: conversation.messages[0].id,
          guid: conversation.messages[0].guid,
          conversationId: conversation.messages[0].conversation_id,
          senderId: conversation.messages[0].sender_id,
          messageType: conversation.messages[0].message_type,
          content: conversation.messages[0].content,
          createdAt: conversation.messages[0].created_at,
          deletedAt: conversation.messages[0].deleted_at,
          callType: conversation.messages[0].call_type,
          callStatus: conversation.messages[0].call_status,
          status: conversation.messages[0].message_status,
          user: conversation.messages[0].user
            ? {
              id: conversation.messages[0].user.id,
              firstName: conversation.messages[0].user.first_name,
              lastName: conversation.messages[0].user.last_name,
              email: conversation.messages[0].user.email,
            }
            : undefined,
        }
        : null,
    };
  }

  async getConversationDetail(
    account: TAccountRequest,
    id: number,
  ): Promise<ConversationVm> {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id,
        deleted_at: null,
        participants: { some: { user_id: account.id } },
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
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    return this.toConversationVm(conversation);
  }

  async getConversations(
    account: TAccountRequest,
    pageable: Pageable,
  ): Promise<PagedResponse<ConversationVm>> {
    const { page = 1, size = 10, search, order = 'desc' } = pageable;
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(size) ||
      size < 1
    ) {
      throw new BadRequestException('Page and size must be positive integers');
    }
    const skip = (page - 1) * size;

    const [conversations, total] = await Promise.all([
      this.prismaService.conversation.findMany({
        where: {
          deleted_at: null,
          participants: { some: { user_id: account.id } },
          ...(search && { title: { contains: search, mode: 'insensitive' } }),
        },
        skip,
        take: size,
        orderBy: { updated_at: order === 'asc' ? 'asc' : 'desc' },
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
            where: { deleted_at: null },
            orderBy: { created_at: 'desc' },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prismaService.conversation.count({
        where: {
          deleted_at: null,
          participants: { some: { user_id: account.id } },
          ...(search && { title: { contains: search, mode: 'insensitive' } }),
        },
      }),
    ]);

    return {
      page,
      size,
      totalPage: Math.ceil(total / size),
      totalElement: total,
      result: conversations.map((conv) => this.toConversationVm(conv)),
    };
  }

  async kickParticipant(
    account: TAccountRequest,
    conversationAction: ConversationActionDto,
  ): Promise<{ success: boolean; message: string }> {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: conversationAction.conversationId,
        deleted_at: null,
        participants: {
          some: { user_id: account.id, type: ParticipantType.LEAD },
        },
      },
      include: { participants: true },
    });

    if (!conversation) {
      throw new ForbiddenException(
        'You lack permission or conversation not found',
      );
    }

    const target = conversation.participants.find(
      (p) => p.user_id === conversationAction.targetUserId,
    );
    if (!target) {
      throw new NotFoundException('Target user not found in conversation');
    }
    if (target.type === ParticipantType.LEAD) {
      throw new ForbiddenException('Cannot kick the conversation leader');
    }

    await this.prismaService.participant.delete({ where: { id: target.id } });
    return { success: true, message: 'Participant removed successfully' };
  }

  async addParticipant(
    account: TAccountRequest,
    conversationAction: ConversationActionDto,
  ): Promise<{ success: boolean; message: string; participant: any }> {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: conversationAction.conversationId,
        deleted_at: null,
        participants: {
          some: { user_id: account.id},
        },
      },
      include: { participants: true },
    });

    if (!conversation) {
      throw new ForbiddenException(
        'You lack permission or conversation not found',
      );
    }

    if (
      conversation.participants.some(
        (p) => p.user_id === conversationAction.targetUserId,
      )
    ) {
      throw new BadRequestException('User is already a participant');
    }

    const targetUser = await this.prismaService.user.findFirst({
      where: {
        id: conversationAction.targetUserId,
        is_active: true,
        is_blocked: false,
      },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found or unavailable');
    }

    const newParticipant = await this.prismaService.participant.create({
      data: {
        conversation_id: conversationAction.conversationId,
        user_id: conversationAction.targetUserId,
        type: ParticipantType.MEMBER,
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
      message: 'Participant added successfully',
      participant: newParticipant,
    };
  }

  async leaveConversation(
    account: TAccountRequest,
    actionDto: ConversationActionDto,
  ): Promise<{ success: boolean; message: string }> {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: actionDto.conversationId,
        deleted_at: null,
        participants: { some: { user_id: account.id } },
      },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found or you are not a participant',
      );
    }

    const participant = conversation.participants.find(
      (p) => p.user_id === account.id,
    );
    if (!participant) {
      throw new NotFoundException('You are not a participant');
    }

    const isLeader = participant.type === ParticipantType.LEAD;
    const others = conversation.participants.filter(
      (p) => p.user_id !== account.id,
    );

    if (isLeader && others.length > 0) {
      const newLeader = others.reduce((earliest, current) =>
        current.created_at < earliest.created_at ? current : earliest,
      );
      await this.prismaService.participant.update({
        where: { id: newLeader.id },
        data: { type: ParticipantType.LEAD },
      });
    }

    await this.prismaService.participant.delete({
      where: { id: participant.id },
    });

    if (others.length === 0) {
      await this.prismaService.conversation.update({
        where: { id: actionDto.conversationId },
        data: { deleted_at: new Date() },
      });
      return {
        success: true,
        message: 'Conversation archived as you were the last participant',
      };
    }

    return {
      success: true,
      message: isLeader
        ? 'You left and leadership was transferred'
        : 'You left the conversation successfully',
    };
  }

  private validateCreateConversationRequest(
    createConversationDto: CreateConversationDto,
    account: TAccountRequest,
  ): void {
    if (!createConversationDto.title?.trim()) {
      throw new BadRequestException('Conversation title is required');
    }
    // if (!account?.id || createConversationDto.creatorId !== account.id) {
    //   throw new BadRequestException('Invalid account or creator mismatch');
    // }
    if (createConversationDto.participants?.length == 1) {
      throw new BadRequestException(
        'At least one participant is required besides the creator',
      );
    }
  }

  async joinConversation(
    account: TAccountRequest,
    {
      conversationId,
    }: { conversationId: number },
  ): Promise<{ success: boolean; message: string; participant: any }> {
    // Verify the conversation exists and is not deleted
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: conversationId,
        deleted_at: null,
      },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is already a participant
    const existingParticipant = conversation.participants.find(
      (p) => p.user_id === account.id,
    );

    if (existingParticipant) {
      throw new BadRequestException(
        'You are already a participant in this conversation',
      );
    }

    // Verify the user is active
    const user = await this.prismaService.user.findFirst({
      where: {
        id: account.id,
        is_active: true,
        is_blocked: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Your account is inactive or blocked');
    }

    // Create new participant with UNVERIFIED status
    const newParticipant = await this.prismaService.participant.create({
      data: {
        conversation_id: conversationId,
        user_id: account.id,
        type: ParticipantType.MEMBER,
        status: ParticipantStatus.UNVERIFIED,
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
      message: 'Join request sent successfully',
      participant: newParticipant,
    };
  }

  async approveJoinConversation(
    account: TAccountRequest,
    {
      conversationId,
      targetUserId,
    }: {
      conversationId: number;
      targetUserId: number;
    },
  ): Promise<{ success: boolean; message: string; participant: any }> {
    // First verify that the approver (account) is a LEAD of the conversation
    const approverParticipant = await this.prismaService.participant.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: account.id,
        type: ParticipantType.LEAD,
      },
    });

    if (!approverParticipant) {
      throw new ForbiddenException(
        'Only conversation leaders can approve join requests',
      );
    }

    // Verify the conversation exists and is not deleted
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: conversationId,
        deleted_at: null,
      },
      include: {
        participants: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Find the target participant (user being approved)
    const targetParticipant = conversation.participants.find(
      (p) => p.user_id === targetUserId,
    );

    if (!targetParticipant) {
      throw new NotFoundException(
        'User has not requested to join this conversation',
      );
    }

    if (targetParticipant.status === ParticipantStatus.VERIFIED) {
      throw new BadRequestException(
        'User is already verified in this conversation',
      );
    }

    // Update participant status to VERIFIED
    const updatedParticipant = await this.prismaService.participant.update({
      where: { id: targetParticipant.id },
      data: {
        status: ParticipantStatus.VERIFIED,
        verified_by: account.id, // Record who approved the request
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
      message: 'Join request approved successfully',
      participant: updatedParticipant,
    };
  }
}
