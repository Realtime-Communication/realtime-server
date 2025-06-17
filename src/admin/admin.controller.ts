import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AccountFilterDto, UpdateAccountDto } from './dto/account.dto';
import { ReportFilterDto, UpdateReportDto } from './dto/report.dto';
import { ConversationFilterDto, DeleteConversationDto } from './dto/conversation.dto';
import { AccountListVM, AccountVM } from './vm/account.vm';
import { ReportListVM, ReportVM } from './vm/report.vm';
import { ConversationListVM, ConversationVM } from './vm/conversation.vm';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  // Account Management
  @Get('accounts')
  async getAccounts(@Query() filter: AccountFilterDto): Promise<AccountListVM> {
    return this.adminService.getAccounts(filter);
  }

  @Patch('accounts')
  async updateAccount(
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<AccountVM> {
    return this.adminService.updateAccount(updateAccountDto);
  }

  // Report Management
  @Get('reports')
  async getReports(@Query() filter: ReportFilterDto): Promise<ReportListVM> {
    return this.adminService.getReports(filter);
  }

  @Patch('reports')
  async updateReport(
    @Body() updateReportDto: UpdateReportDto,
  ): Promise<ReportVM> {
    return this.adminService.updateReport(updateReportDto.id, updateReportDto);
  }

  // Conversation Management
  @Get('conversations')
  async getConversations(@Query() filter: ConversationFilterDto): Promise<ConversationListVM> {
    return this.adminService.getConversations(filter);
  }

  @Delete('conversations')
  async deleteConversation(@Body() deleteConversationDto: DeleteConversationDto): Promise<void> {
    return this.adminService.deleteConversation(deleteConversationDto.id);
  }
}
