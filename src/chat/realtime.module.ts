import { Module } from '@nestjs/common';
import { ChatGateway } from './realtime.gateway';
import { ChatController } from './chat.controller';
import { ChatService } from './realtime.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SMessage, SMessageSchema } from './schemas/message.shema';
import { UsersModule } from 'src/users/users.module';
import { GroupsModule } from 'src/groups/groups.module';
import { GroupsService } from 'src/groups/groups.service';
import { CacheManager } from './cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SMessage.name, schema: SMessageSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UsersModule,
    GroupsModule,
  ],
  providers: [ChatGateway, ChatService, CacheManager],
  controllers: [ChatController],
})
export class ChatModule {}
