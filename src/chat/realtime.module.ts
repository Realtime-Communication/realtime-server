import { Module } from "@nestjs/common";
import { ChatGateway } from "./realtime.gateway";
import { ChatController } from "./chat.controller";
import { ChatService } from "./realtime.service";
import { HelpersModule } from "src/helpers/helpers.module";
import { MongooseModule } from "@nestjs/mongoose";
import { Chat, ChatSchema } from "./schemas/chat.shema";
import { UsersModule } from "src/users/users.module";
import { User, UserSchema } from "src/users/schemas/user.schema";
import { GroupsModule } from "src/groups/groups.module";
import { GroupsService } from "src/groups/groups.service";
import { CacheManager } from "./cacheManager.service";

@Module({
    imports: [
        HelpersModule,
        MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        UsersModule,
        GroupsModule
    ],
    providers: [
        ChatGateway, 
        ChatService,
        CacheManager
    ],
    controllers: [ChatController]
})
export class ChatModule {}