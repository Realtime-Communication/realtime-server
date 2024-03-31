import { Controller, Delete, Get, Injectable, Param, Post, Query, Render, Req, Request, Res, UseGuards } from '@nestjs/common';
import { ChatService } from './realtime.service';
import { IUser } from 'src/users/user.interface';
import { User } from 'src/decorators/user.decorator';
import mongoose from 'mongoose';

@Injectable()
@Controller('chats')
export class ChatController {
  constructor(
    private readonly chatService: ChatService
  ){}

    @Get('/mychats')
    async Chat(
        @Request() req
    ) {
        return await this.chatService.getMyChats(req.user.userId);
    }

    @Get('/conversations')
    async AllFriends(
        @User() user: IUser
    ) {
        return await this.chatService.conversations(user);
    }

    @Get('/with-id/:id')
    async GetChatWithId(
        @Param('id') to_id: string,
        @User() user: IUser,
        @Query('limit') limit: number
    ) {
        if(to_id == 'all') return await this.chatService.getChatGlobal(user._id);
        else 
        return await this.chatService.getChatWithId(to_id, limit, user._id);
    }

    @Get('/getlastchats')
    async GetLastChats(
        @User() user: IUser
    ) {
        return this.chatService.getLastChats(user);
    }

    @Delete('/delete/:id')
    async DeleteChat(
        @Param('id') id: string
    ) {
        return this.chatService.deleteChat(id);
    }
}