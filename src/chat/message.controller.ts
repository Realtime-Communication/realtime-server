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
import { ChatService } from './message.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TAccountRequest } from '../decorators/account-request.decorator';
import { AccountRequest } from '../decorators/account-request.decorator';
import { MessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: ChatService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createMessage(
    @AccountRequest() user: TAccountRequest,
    @Body() messageDto: MessageDto
  ) {
    return this.messageService.saveMessage(user, messageDto);
  }

  @Get('conversation/:conversationId')
  @UseGuards(JwtAuthGuard)
  async getMessagesByConversation(
    @AccountRequest() user: TAccountRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20
  ) {
    return this.messageService.getMessagesByConversation(user.id, conversationId, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getMessage(
    @AccountRequest() user: TAccountRequest,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.messageService.getMessage(user.id, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateMessage(
    @AccountRequest() user: TAccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMessageDto: UpdateMessageDto
  ) {
    return this.messageService.updateMessage(user.id, id, updateMessageDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @AccountRequest() user: TAccountRequest,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.messageService.deleteMessage(user, id);
  }
}
