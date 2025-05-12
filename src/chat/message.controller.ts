import { Controller, Delete, Get, Injectable, Param } from '@nestjs/common';
import { ChatService } from './message.service';

@Injectable()
@Controller('chats')
export class MessageController {
  constructor(private readonly chatService: ChatService) {}

  // @Get('/mychats')
  // async SMessage(@Request() req) {
  //   return await this.chatService.getMyChats(req.user.userId);
  // }
  // -> Conversation

  // @Get('/with-id/:id')
  // async GetChatWithId(
  //   @Param('id') to_id: string,
  //   @Query('limit') limit: number,
  //   @AccountRequest() account: TAccountRequest,
  // ) {
  //   if (to_id == 'all') return await this.chatService.getChatGlobal(user._id);
  //   else return await this.chatService.getChatWithId(to_id, limit, user._id);
  // }

  // @Get('/getlastchats')
  // async GetLastChats(@User() user: IUser) {
  //   return this.chatService.getLastChats(user);
  // }

  // @Delete('/delete/:id')
  // async DeleteChat(@Param('id') id: string) {
  //   return this.chatService.deleteChat(id);
  // }
}
