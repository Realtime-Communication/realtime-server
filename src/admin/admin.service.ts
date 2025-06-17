import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AccountFilterDto, UpdateAccountDto } from './dto/account.dto';
import { ReportFilterDto, UpdateReportDto } from './dto/report.dto';
import { ConversationFilterDto } from './dto/conversation.dto';
import { AccountListVM, AccountVM } from './vm/account.vm';
import { ReportListVM, ReportVM } from './vm/report.vm';
import { ConversationListVM, ConversationVM } from './vm/conversation.vm';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Account Management
  async getAccounts(filter: AccountFilterDto): Promise<AccountListVM> {
    // Define searchable fields for the account search
    const searchableFields = [
      'email',
      'phone',
      'first_name',
      'middle_name',
      'last_name',
      'preferences'
    ];

    // Field mapping from camelCase to snake_case
    const fieldMapping: Record<string, string> = {
      firstName: 'first_name',
      middleName: 'middle_name',
      lastName: 'last_name',
      isBlocked: 'is_blocked',
      isActive: 'is_active',
      levelLeft: 'level_left',
      levelRight: 'level_right',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    // Build the where clause
    const where: Prisma.UserWhereInput = {
      AND: [
        // Apply search filter if search term is provided
        filter.search && filter.searchFields?.length ? {
          OR: filter.searchFields
            .filter(field => searchableFields.includes(fieldMapping[field] || field))
            .map(field => ({
              [fieldMapping[field] || field]: { contains: filter.search, mode: 'insensitive' }
            }))
        } : {},
        // Apply individual filters
        {
          ...(filter.id && { id: filter.id }),
          ...(filter.email && { email: { contains: filter.email, mode: 'insensitive' } }),
          ...(filter.phone && { phone: { contains: filter.phone, mode: 'insensitive' } }),
          ...(filter.role && { role: filter.role }),
          ...(filter.isBlocked !== undefined && { is_blocked: filter.isBlocked }),
          ...(filter.isActive !== undefined && { is_active: filter.isActive }),
          ...(filter.firstName && { first_name: { contains: filter.firstName, mode: 'insensitive' } }),
          ...(filter.middleName && { middle_name: { contains: filter.middleName, mode: 'insensitive' } }),
          ...(filter.lastName && { last_name: { contains: filter.lastName, mode: 'insensitive' } }),
          ...(filter.preferences && { preferences: { contains: filter.preferences, mode: 'insensitive' } }),
          ...(filter.levelLeft !== undefined && { level_left: filter.levelLeft }),
          ...(filter.levelRight !== undefined && { level_right: filter.levelRight }),
        }
      ].filter(Boolean) as Prisma.UserWhereInput[]
    };

    // Set default ordering if not provided
    const orderBy: Record<string, 'asc' | 'desc'> = filter.order
      ? {
          [fieldMapping[filter.order.split(',')[0]] || filter.order.split(',')[0]]: 
            filter.order.split(',')[1] === 'asc' ? 'asc' : 'desc'
        }
      : { created_at: 'desc' };

    const skip = (filter.page - 1) * filter.size;
    const take = filter.size;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          phone: true,
          email: true,
          role: true,
          is_blocked: true,
          is_active: true,
          first_name: true,
          middle_name: true,
          last_name: true,
          preferences: true,
          level_left: true,
          level_right: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    return {
      items: users.map((user) => ({
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        isBlocked: user.is_blocked,
        isActive: user.is_active,
        firstName: user.first_name,
        middleName: user.middle_name,
        lastName: user.last_name,
        preferences: user.preferences,
        levelLeft: user.level_left,
        levelRight: user.level_right,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      })),
      total,
      page: filter.page,
      size: filter.size,
      totalPages,
    };
  }

  async updateAccount(dto: UpdateAccountDto): Promise<AccountVM> {
    const updatedUser = await this.prisma.user.update({
      where: { id: dto.id },
      data: {
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        is_blocked: dto.isBlocked,
        is_active: dto.isActive,
        first_name: dto.firstName,
        middle_name: dto.middleName,
        last_name: dto.lastName,
        preferences: dto.preferences,
        level_left: dto.levelLeft,
        level_right: dto.levelRight,
      },
    });

    // Transform snake_case to camelCase
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      isBlocked: updatedUser.is_blocked,
      isActive: updatedUser.is_active,
      firstName: updatedUser.first_name,
      middleName: updatedUser.middle_name,
      lastName: updatedUser.last_name,
      preferences: updatedUser.preferences,
      levelLeft: updatedUser.level_left,
      levelRight: updatedUser.level_right,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
    };
  }

  // Report Management
  async getReports(filter: ReportFilterDto): Promise<ReportListVM> {
    // Define searchable fields for the report search
    const searchableFields = [
      'report_type',
      'notes',
      'status'
    ];

    // Field mapping from camelCase to snake_case
    const fieldMapping: Record<string, string> = {
      reportType: 'report_type',
      rejectedReason: 'rejected_reason',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    // Build the where clause
    const where: Prisma.ReportWhereInput = {
      AND: [
        // Apply search filter if search term is provided
        filter.search && filter.searchFields?.length ? {
          OR: filter.searchFields
            .filter(field => searchableFields.includes(fieldMapping[field] || field))
            .map(field => ({
              [fieldMapping[field] || field]: { contains: filter.search, mode: 'insensitive' }
            }))
        } : filter.search ? {
          OR: [
            { report_type: { contains: filter.search, mode: 'insensitive' } },
            { notes: { contains: filter.search, mode: 'insensitive' } },
          ],
        } : {},
        // Apply individual filters
        {
          ...(filter.status && { status: filter.status }),
        }
      ].filter(Boolean) as Prisma.ReportWhereInput[]
    };

    // Set default ordering if not provided
    const orderBy: Record<string, 'asc' | 'desc'> = filter.order
      ? {
          [fieldMapping[filter.order.split(',')[0]] || filter.order.split(',')[0]]: 
            filter.order.split(',')[1] === 'asc' ? 'asc' : 'desc'
        }
      : { created_at: 'desc' };

    const skip = (filter.page - 1) * filter.size;
    const take = filter.size;

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          participant: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    // Transform snake_case to camelCase
    const transformedItems = items.map(item => ({
      id: item.id,
      userId: item.user_id,
      participantId: item.participant_id,
      reportType: item.report_type,
      notes: item.notes,
      status: item.status,
      createdAt: item.created_at,
      rejectedReason: item.rejected_reason,
      user: {
        id: item.user.id,
        firstName: item.user.first_name,
        lastName: item.user.last_name,
        email: item.user.email,
      },
      participant: {
        id: item.participant.id,
        firstName: item.participant.first_name,
        lastName: item.participant.last_name,
        email: item.participant.email,
      },
    }));

    return { 
      items: transformedItems, 
      total,
      page: filter.page,
      size: filter.size,
      totalPages,
    };
  }

  async updateReport(id: number, dto: UpdateReportDto): Promise<ReportVM> {
    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        rejected_reason: dto.rejectedReason,
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
        participant: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    // Transform snake_case to camelCase
    return {
      id: updatedReport.id,
      userId: updatedReport.user_id,
      participantId: updatedReport.participant_id,
      reportType: updatedReport.report_type,
      notes: updatedReport.notes,
      status: updatedReport.status,
      createdAt: updatedReport.created_at,
      rejectedReason: updatedReport.rejected_reason,
      user: {
        id: updatedReport.user.id,
        firstName: updatedReport.user.first_name,
        lastName: updatedReport.user.last_name,
        email: updatedReport.user.email,
      },
      participant: {
        id: updatedReport.participant.id,
        firstName: updatedReport.participant.first_name,
        lastName: updatedReport.participant.last_name,
        email: updatedReport.participant.email,
      },
    };
  }

  // Conversation Management
  async getConversations(filter: ConversationFilterDto): Promise<ConversationListVM> {
    // Define searchable fields for the conversation search
    const searchableFields = [
      'title'
    ];

    // Field mapping from camelCase to snake_case
    const fieldMapping: Record<string, string> = {
      creatorId: 'creator_id',
      channelId: 'channel_id',
      avatarUrl: 'avatar_url',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at'
    };

    // Build the where clause
    const where: Prisma.ConversationWhereInput = {
      AND: [
        // Apply search filter if search term is provided
        filter.search && filter.searchFields?.length ? {
          OR: filter.searchFields
            .filter(field => searchableFields.includes(fieldMapping[field] || field))
            .map(field => ({
              [fieldMapping[field] || field]: { contains: filter.search, mode: 'insensitive' }
            }))
        } : filter.search ? {
          OR: [
            { title: { contains: filter.search, mode: 'insensitive' } },
          ],
        } : {},
        // Apply individual filters
        {
          ...(filter.creator_id && { creator_id: parseInt(filter.creator_id) }),
        }
      ].filter(Boolean) as Prisma.ConversationWhereInput[]
    };

    // Set default ordering if not provided
    const orderBy: Record<string, 'asc' | 'desc'> = filter.order
      ? {
          [fieldMapping[filter.order.split(',')[0]] || filter.order.split(',')[0]]: 
            filter.order.split(',')[1] === 'asc' ? 'asc' : 'desc'
        }
      : { created_at: 'desc' };

    const skip = (filter.page - 1) * filter.size;
    const take = filter.size;

    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          creator: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          participants: {
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
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    // Transform snake_case to camelCase
    const transformedItems = items.map(item => ({
      id: item.id,
      title: item.title,
      creatorId: item.creator_id,
      channelId: item.channel_id,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      deletedAt: item.deleted_at,
      avatarUrl: item.avatar_url,
      creator: {
        id: item.creator.id,
        firstName: item.creator.first_name,
        lastName: item.creator.last_name,
        email: item.creator.email,
      },
      participants: item.participants.map(participant => ({
        id: participant.id,
        conversationId: participant.conversation_id,
        userId: participant.user_id,
        type: participant.type,
        status: participant.status,
        createdAt: participant.created_at,
        updatedAt: participant.updated_at,
        verifiedBy: participant.verified_by,
        user: {
          id: participant.user.id,
          firstName: participant.user.first_name,
          lastName: participant.user.last_name,
          email: participant.user.email,
        },
      })),
    }));

    return { 
      items: transformedItems, 
      total,
      page: filter.page,
      size: filter.size,
      totalPages,
    };
  }

  async deleteConversation(id: number): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
