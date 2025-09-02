import { Module } from '@nestjs/common';
import { GroupsController } from './conversations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationService } from './conversations.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PrismaModule } from 'src/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GroupsController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
