import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AccountRequest = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<TCustomRequest>();
    if (!request?.account) {
      throw new Error(
        'No account credentials found, make sure you put the "@Roles([...])" decorator on the route',
      );
    }
    return request.account;
  },
);

export type TCustomRequest = Request & {
  account?: TAccountRequest;
};

// role: AccountRole;
export type TAccountRequest = {
  id: string;
};
