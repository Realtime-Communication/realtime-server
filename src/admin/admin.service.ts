import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AccountFilterDto, UpdateAccountDto } from './dto/account.dto';
import { ReportFilterDto, UpdateReportDto } from './dto/report.dto';
import { ConversationFilterDto } from './dto/conversation.dto';
import { AccountListVM, AccountVM } from './vm/account.vm';
import { ReportListVM, ReportVM } from './vm/report.vm';
import { ConversationListVM, ConversationVM } from './vm/conversation.vm';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Account Management
  async getAccounts(filter: AccountFilterDto): Promise<AccountListVM> {
    const where = {
      ...(filter.search && {
        OR: [
          { first_name: { contains: filter.search } },
          { last_name: { contains: filter.search } },
          { email: { contains: filter.search } },
          { phone: { contains: filter.search } },
        ],
      }),
      ...(filter.role && { role: filter.role }),
      ...(filter.is_blocked !== undefined && { is_blocked: filter.is_blocked }),
      ...(filter.is_active !== undefined && { is_active: filter.is_active }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  async updateAccount(id: number, dto: UpdateAccountDto): Promise<AccountVM> {
    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  // Report Management
  async getReports(filter: ReportFilterDto): Promise<ReportListVM> {
    const where = {
      ...(filter.status && { status: filter.status }),
      ...(filter.search && {
        OR: [
          { report_type: { contains: filter.search } },
          { notes: { contains: filter.search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
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
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { items, total };
  }

  async updateReport(id: number, dto: UpdateReportDto): Promise<ReportVM> {
    return this.prisma.report.update({
      where: { id },
      data: dto,
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
  }

  // Conversation Management
  async getConversations(filter: ConversationFilterDto): Promise<ConversationListVM> {
    const where = {
      ...(filter.search && {
        OR: [
          { title: { contains: filter.search } },
        ],
      }),
      ...(filter.creator_id && { creator_id: parseInt(filter.creator_id) }),
    };

    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
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
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return { items, total };
  }

  async deleteConversation(id: number): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
