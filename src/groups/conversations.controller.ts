import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import {
  AccountRequest,
  TAccountRequest,
} from 'src/decorators/account-request.decorator';
import { CreateConversationDto } from './model/create-conversation.dto';
import { QueryMessageDto } from './model/query-message.dto';
import { ConversationActionDto } from './model/action-conversation.dto';
import { ConversationActionType } from './model/action.enum';
import { ConversationService } from './conversations.service';
import { Pageable } from 'src/common/pagination/pageable.dto';

@Controller('conversations')
export class GroupsController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get('/:id')
  async getConversationDetail(
    @Param('id') id: number,
    @AccountRequest() account: TAccountRequest,
  ) {
    return this.conversationService.getConversationDetail(account, id);
  }

  @Get('')
  async getConversation(
    @AccountRequest() account: TAccountRequest,
    @Query() pageable: Pageable,
  ) {
    return await this.conversationService.getConversations(account, pageable);
  }

  @Post('/create')
  async creteConversation(
    @Body() createConversationDto: CreateConversationDto,
    @AccountRequest() account: TAccountRequest,
  ) {
    return this.conversationService.createConversation(
      createConversationDto,
      account,
    );
  }

  @Get('/:id/message')
  async getConversationMessages(
    @Query() queryMessageDto: QueryMessageDto,
    @AccountRequest() account: TAccountRequest,
    @Param('id') id: number,
  ) {
    return this.conversationService.getConversationMessages(account, {
      ...queryMessageDto,
      conversationId: id,
    });
  } 

  @Post('/kick')
  async kickParticipant(
    @AccountRequest() account: TAccountRequest,
    @Body() actionDto: ConversationActionDto,
  ) {
    // if (actionDto.actionType !== ConversationActionType.KICK) {
    //   throw new Error('Invalid action type');
    // }

    return await this.conversationService.kickParticipant(account, {
      ...actionDto,
    });
  }

  @Post('/add')
  async manageParticipant(
    @AccountRequest() account: TAccountRequest,
    @Body() actionDto: ConversationActionDto,
  ) {
    return await this.conversationService.addParticipant(account, {
      ...actionDto,
    });
  }

  @Post('/leave')
  async leaveConversation(
    @AccountRequest() account: TAccountRequest,
    @Body() actionDto: ConversationActionDto,
  ) {
    return await this.conversationService.leaveConversation(account, {
      ...actionDto,
    });
  }

  @Post("/join")
  async joinConversation(
    @AccountRequest() account: TAccountRequest,
    @Body() actionDto: ConversationActionDto,
  ) {
    return await this.conversationService.joinConversation(account, {
      ...actionDto,
    });
  }


  @Post("/approve")
  async approveJoinConversation(
    @AccountRequest() account: TAccountRequest,
    @Body() actionDto: ConversationActionDto,
  ) {
    return await this.conversationService.approveJoinConversation(account, {
      ...actionDto,
    });
  }
}
