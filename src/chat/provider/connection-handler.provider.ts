import { Provider } from '@nestjs/common';
import { Server } from 'socket.io';
import { ConnectionHandler } from '../handlers/connection.handler';
import { ChatService } from '../chat.service';
import { CacheManagerService } from '../services/cache-manager.service';

export const CONNECTION_HANDLER_FACTORY = 'CONNECTION_HANDLER_FACTORY';

export const connectionHandlerProvider: Provider = {
  provide: CONNECTION_HANDLER_FACTORY,
  useFactory: (
    chatService: ChatService,
    cacheManagerService: CacheManagerService,
  ) => {
    return (server: Server) => new ConnectionHandler(
      chatService,
      cacheManagerService,
      server
    );
  },
  inject: [ChatService, CacheManagerService],
};
