import { Module } from "@nestjs/common";
import { ChatGateway } from "./realtime.gateway";
import { ChatController } from "./chat.controller";
import { ChatService } from "./realtime.service";
import { HelpersModule } from "src/helpers/helpers.module";
import { MongooseModule } from "@nestjs/mongoose";
import { Chat, ChatSchema } from "./schemas/chat.shema";
import { UsersModule } from "src/users/users.module";
import { User, UserSchema } from "src/users/schemas/user.schema";

@Module({
    imports: [
        HelpersModule,
        MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
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