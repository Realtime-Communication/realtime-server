import { Module } from '@nestjs/common';
import { ChatGateway } from './realtime.gateway';
import { MessageController } from './message.controller';
import { ChatService } from './message.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from 'src/users/users.module';
import { CacheManager } from './cache.service';

@Module({
  imports: [
    // MongooseModule.forFeature([{ name: SMessage.name, schema: SMessageSchema }]),
    // MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UsersModule,
  ],
  providers: [ChatGateway, ChatService, CacheManager],
  controllers: [MessageController],
})
export class ChatModule {}
