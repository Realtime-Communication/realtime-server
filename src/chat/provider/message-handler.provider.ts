import { Provider } from '@nestjs/common';
import { Server } from 'socket.io';
import { ConnectionHandler } from '../handlers/connection.handler';
import { ChatService } from '../chat.service';
import { CacheManagerService } from '../services/cache-manager.service';
import { MessageHandler } from '../handlers';

export const MESSAGE_HANDLER_FACTORY = 'MESSAGE_HANDLER_FACTORY';

export const messageHandlerProvider: Provider = {
  provide: MESSAGE_HANDLER_FACTORY,
  useFactory: (
    chatService: ChatService,
  ) => {
    return (server: Server) => new MessageHandler(
      chatService,
      server
    );
  },
  inject: [ChatService],
};
