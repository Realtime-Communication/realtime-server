import { Provider } from '@nestjs/common';
import { Server } from 'socket.io';
import { ConnectionHandler } from '../handlers/connection.handler';
import { ChatService } from '../chat.service';
import { CacheManagerService } from '../services/cache-manager.service';
import { CallHandler, MessageHandler } from '../handlers';
import { MESSAGE_HANDLER_FACTORY } from './message-handler.provider';

export const CALL_HANDLER_FACTORY = 'CALL_HANDLER_FACTORY';

export const callHandlerProvider: Provider = {
  provide: CALL_HANDLER_FACTORY,
  useFactory: (
    chatService: ChatService,
  ) => {
    return (server: Server) => new CallHandler  (
      chatService,
      server
    );
  },
  inject: [ChatService],
};
