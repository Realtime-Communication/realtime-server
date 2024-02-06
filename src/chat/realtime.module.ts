import { Module } from "@nestjs/common";
import { ChatGateway } from "./realtime.gateway";
import { ChatController } from "./chat.controller";
import { ChatService } from "./realtime.service";
import { HelpersModule } from "src/helpers/helpers.module";
import { MongooseModule } from "@nestjs/mongoose";
import { Chat, ChatSchema } from "./schemas/chat.shema";
import { UsersModule } from "src/users/users.module";

@Module({
    imports: [
        HelpersModule,
        MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
        UsersModule
    ],
    providers: [
        ChatGateway, 
        ChatService,
        ChatController
    ],
    controllers: [ChatController],
})
export class ChatModule {}