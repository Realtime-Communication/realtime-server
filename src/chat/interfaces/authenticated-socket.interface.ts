import { Socket } from 'socket.io';
import { TAccountRequest } from 'src/decorators/account-request.decorator';

export interface AuthenticatedSocket extends Socket {
  account: TAccountRequest;
} 
