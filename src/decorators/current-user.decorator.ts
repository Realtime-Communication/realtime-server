import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TAccountRequest } from './account-request.decorator';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TAccountRequest => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
