import { Module } from '@nestjs/common';
import { ChatGateway } from './realtime.gateway';
import { MessageController } from './message.controller';
import { ChatService } from './message.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SMessage, SMessageSchema } from './schemas/message.shema';
import { UsersModule } from 'src/users/users.module';
import { GroupsModule } from 'src/conversations/conversations.module';
import { GroupsService } from 'src/conversations/conversations.service';
import { CacheManager } from './cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SMessage.name, schema: SMessageSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UsersModule,
    GroupsModule,
  ],
  providers: [ChatGateway, ChatService, CacheManager],
  controllers: [MessageController],
})
export class ChatModule {}
