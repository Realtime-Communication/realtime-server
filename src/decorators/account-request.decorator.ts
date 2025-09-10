import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AccountRole } from '@prisma/client';

export const AccountRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TAccountRequest => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.account) {
      throw new Error(
        'No account credentials found, make sure you put the "@Roles([...])" decorator on the route',
      );
    }
    return request.account as TAccountRequest;
  },
  
);

export type TAccountRequest = {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  type: AccountRole | string;
  socketId?: string;
};
