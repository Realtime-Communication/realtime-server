import { Socket } from 'socket.io';
import { TAccountRequest } from '../../../../decorators/account-request.decorator';

export interface AuthenticatedSocket extends Socket {
  account: TAccountRequest;
} 
