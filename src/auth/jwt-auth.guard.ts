import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  override handleRequest(
    err: any,
    user: any,
    info: any,
    context?: ExecutionContext,
  ): any {
    if (err || !user) {
      throw err || new UnauthorizedException('Token không hợp lệ');
    }

    // Attach user to the request for further decorators
    const request = context?.switchToHttp().getRequest();
    if (request) {
      request.account = user;
    }

    return user;
  }
}
