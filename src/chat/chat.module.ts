import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

// Core modules
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

// Chat module components
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    ChatController,
  ],
  providers: [
    ChatService,
    ChatGateway,
    WsJwtGuard,
    JwtService,
  ],
  exports: [
    ChatService,
  ],
})
export class ChatModule {} 
