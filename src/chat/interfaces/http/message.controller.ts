import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  ParseIntPipe,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AccountRequest, TAccountRequest } from '../../../decorators/account-request.decorator';
import { MessageQueryService } from '../../application/queries/message.queries';
import { MessageCommandService } from '../../application/commands/message.commands';
import { MessageDto, UpdateMessageDto } from '../../application/dtos/message.dto';

@Controller('messages')
export class MessageController {
  constructor(
    private readonly messageQueryService: MessageQueryService,
    private readonly messageCommandService: MessageCommandService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createMessage(
    @AccountRequest() user: TAccountRequest,
    @Body() messageDto: MessageDto
  ) {
    return this.messageCommandService.saveMessage(user.id, messageDto);
  }

  @Get('conversation/:conversationId')
  @UseGuards(JwtAuthGuard)
  async getMessagesByConversation(
    @AccountRequest() user: TAccountRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20
  ) {
    return this.messageQueryService.getMessagesByConversation(
      user.id,
      conversationId,
      page,
      limit
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getMessage(
    @AccountRequest() user: TAccountRequest,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.messageQueryService.getMessage(user.id, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateMessage(
    @AccountRequest() user: TAccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMessageDto: UpdateMessageDto
  ) {
    return this.messageCommandService.updateMessage(user.id, id, updateMessageDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @AccountRequest() user: TAccountRequest,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.messageCommandService.deleteMessage(user.id, id);
  }
} 
