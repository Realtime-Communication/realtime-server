import { Module } from '@nestjs/common';
import { GroupsController } from './conversations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationService } from './conversations.service';

@Module({
  imports: [
    // MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
    // HelpersModule
  ],
  controllers: [GroupsController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class GroupsModule {}
