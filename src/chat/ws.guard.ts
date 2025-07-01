import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';
import { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import { WebSocketSecurityService } from './websocket-security.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly securityService: WebSocketSecurityService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const client: AuthenticatedSocket = context.switchToWs().getClient();
    const clientIp = client.handshake.address;

    try {
      // Check IP security first
      if (!this.securityService.checkIPSecurity(clientIp)) {
        this.logger.warn(`Blocked connection from suspicious IP: ${clientIp}`);
        throw new UnauthorizedException('Connection blocked due to security concerns');
      }

      // Extract token from multiple sources
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Missing token for connection from IP: ${clientIp}`);
        this.securityService.markSuspiciousActivity(clientIp);
        throw new UnauthorizedException('Authentication token is required');
      }

      // Verify token
      const payload = this.verifyToken(token);

      // Validate payload structure
      if (!this.isValidPayload(payload)) {
        this.logger.warn(`Invalid token payload from IP: ${clientIp}`);
        this.securityService.markSuspiciousActivity(clientIp);
        throw new UnauthorizedException('Invalid token payload');
      }

      // Attach user info to socket
      this.attachUserToSocket(client, payload);

      this.logger.debug(`User ${payload.id} authenticated from IP: ${clientIp}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Authentication failed for IP ${clientIp}: ${error.message}`
      );

      // Mark suspicious activity for multiple failures
      this.securityService.markSuspiciousActivity(clientIp);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Extract token from various sources
   */
  private extractToken(client: AuthenticatedSocket): string | null {
    // Try auth object first (most common)
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // Try authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    // Try query parameter (fallback)
    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }

  /**
   * Verify JWT token
   */
  private verifyToken(token: string): any {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token format');
      }
      if (error.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not active yet');
      }
      
      throw new UnauthorizedException('Token verification failed');
    }
  }

  /**
   * Validate token payload structure
   */
  private isValidPayload(payload: any): boolean {
    return (
      payload &&
      typeof payload === 'object' &&
      typeof payload.id === 'number' &&
      payload.id > 0 &&
      typeof payload.email === 'string' &&
      payload.email.length > 0 &&
      typeof payload.firstName === 'string' &&
      typeof payload.lastName === 'string' &&
      typeof payload.role === 'string'
    );
  }

  /**
   * Attach user information to socket
   */
  private attachUserToSocket(
    client: AuthenticatedSocket,
    payload: any
  ): void {
    // Add socket ID and connection timestamp to payload
    payload.socketId = client.id;
    payload.connectedAt = new Date();

    // Store additional connection metadata
    payload.clientIp = client.handshake.address;
    payload.userAgent = client.handshake.headers['user-agent'];

    // Attach to socket
    client.account = payload;
  }

  /**
   * Extract user ID from token without full verification (for rate limiting)
   */
  extractUserIdSafely(token: string): number | null {
    try {
      const decoded = this.jwtService.decode(token) as any;
      return decoded?.id || null;
    } catch {
      return null;
    }
  }
}
