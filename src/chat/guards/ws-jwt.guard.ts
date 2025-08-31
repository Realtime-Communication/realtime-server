import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { TAccountRequest } from 'src/decorators/account-request.decorator';

export interface AuthenticatedSocket extends Socket {
  account: TAccountRequest;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client: AuthenticatedSocket = context.switchToWs().getClient();
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn('No token provided');
        return false;
      }

      const payload = this.jwtService.verify(token);

      if (!this.isValidPayload(payload)) {
        this.logger.warn('Invalid token payload');
        return false;
      }

      this.attachUserToSocket(client, payload);
      return true;
    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`);
      return false;
    }
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    // Try auth token first
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // Try Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query parameter
    if (client.handshake.query?.token) {
      return Array.isArray(client.handshake.query.token)
        ? client.handshake.query.token[0]
        : client.handshake.query.token;
    }

    return null;
  }

  private isValidPayload(payload: any): boolean {
    return (
      payload &&
      typeof payload.id === 'number' &&
      typeof payload.email === 'string' &&
      payload.id > 0
    );
  }

  private attachUserToSocket(client: AuthenticatedSocket, payload: any): void {
    client.account = {
      id: payload.id,
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      type: payload.type || 'USER',
      socketId: client.id,
    };
  }
}
