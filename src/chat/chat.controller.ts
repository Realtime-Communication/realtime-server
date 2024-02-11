import { Controller, Get, Injectable, Param, Post, Render, Req, Request, Res, UseGuards } from '@nestjs/common';
import { ChatService } from './realtime.service';
import { Public } from 'src/decorators/public.decorator';

@Injectable()
@Controller('chats')
export class ChatController {
  constructor(
    private readonly chatService: ChatService
  ){}

    @Get('/mychats')
    @Render('index')
    async Home(
        @Request() req
    ){
        this.chatService.setUser(req.user.userId, req.user.username);
    }

    @Get('/api/mychats')
    async Chat(
        @Request() req
    ) {
        return await this.chatService.getMyChats(req.user.userId);
    }

    @Get('/api/friendschats')
    async AllFriends(
        @Request() req
    ) {
        return await this.chatService.getAllFriends(req.user.userId);
    }

    @Get('/api/GetChatWithId/:id')
    async GetChatWithId(
        @Param() to_id,
        @Request() req
    ) {
        if(to_id.id === "all") return await this.chatService.getChatGlobal(req.user.userId);
        else return await this.chatService.getChatWithId(to_id.id, req.user.userId);
    }

    @Get('/api/getlastchats')
    async GetLastChats(
        @Request() req: any
    ) {
        return this.chatService.getLastChats(req.user.userId);
    }
}