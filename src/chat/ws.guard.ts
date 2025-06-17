import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';
import { Socket } from 'socket.io';
import { AuthenticatedSocket } from 'src/chat/realtime.gateway';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwtService: JwtService) { }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const client: AuthenticatedSocket = context.switchToWs().getClient();
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Token không được cung cấp');
    }

    try {
      const payload = this.jwtService.verify(token);
      client.account = payload; // attach decoded user to socket
      return true;
    } catch (err) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
  }
}
