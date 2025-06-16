import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AccountFilterDto, UpdateAccountDto } from './dto/account.dto';
import { ReportFilterDto, UpdateReportDto } from './dto/report.dto';
import { ConversationFilterDto } from './dto/conversation.dto';
import { AccountListVM, AccountVM } from './vm/account.vm';
import { ReportListVM, ReportVM } from './vm/report.vm';
import { ConversationListVM, ConversationVM } from './vm/conversation.vm';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Account Management
  @Get('accounts')
  getAccounts(@Query() filter: AccountFilterDto): Promise<AccountListVM> {
    return this.adminService.getAccounts(filter);
  }

  @Patch('accounts')
  updateAccount(
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<AccountVM> {
    return this.adminService.updateAccount(updateAccountDto);
  }

  // Report Management
  @Get('reports')
  getReports(@Query() filter: ReportFilterDto): Promise<ReportListVM> {
    return this.adminService.getReports(filter);
  }

  @Patch('reports/:id')
  updateReport(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
  ): Promise<ReportVM> {
    return this.adminService.updateReport(+id, updateReportDto);
  }

  // Conversation Management
  @Get('conversations')
  getConversations(@Query() filter: ConversationFilterDto): Promise<ConversationListVM> {
    return this.adminService.getConversations(filter);
  }

  @Delete('conversations/:id')
  deleteConversation(@Param('id') id: string): Promise<void> {
    return this.adminService.deleteConversation(+id);
  }
}
