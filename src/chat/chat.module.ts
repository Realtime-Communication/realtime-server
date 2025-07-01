import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';

// Domain services
import { PrismaModule } from '../common/prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

// Application layer
import { MessageCommandService } from './application/commands/message.commands';
import { MessageQueryService } from './application/queries/message.queries';

// Infrastructure layer
import { PrismaMessageRepository } from './infrastructure/persistence/prisma-message.repository';
import { RedisCacheRepository } from './infrastructure/cache/redis-cache.repository';

// Interface layer
import { MessageController } from './interfaces/http/message.controller';

// Configuration

@Module({
  imports: [
    UsersModule,
    ConfigModule,
    AuthModule,
    PrismaModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
  ],
  controllers: [
    MessageController,
  ],
  providers: [
    // Application layer
    MessageCommandService,
    MessageQueryService,
    
    // Infrastructure layer
    {
      provide: 'MessageRepository',
      useClass: PrismaMessageRepository,
    },
    {
      provide: 'CacheRepository',
      useClass: RedisCacheRepository,
    },
    
    // External services
    JwtService,
  ],
  exports: [
    MessageCommandService,
    MessageQueryService,
  ],
})
export class ChatModule {} 
