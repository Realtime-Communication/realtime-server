import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// decorators/account-request.decorator.ts

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
// role: AccountRole;
export type TAccountRequest = {
  id: number;
  firstName: string;
  lastName: string;
  type;
  socketId;
};
