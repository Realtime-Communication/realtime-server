import { User } from '@prisma/client';

export type AuthUser = User & {
  accessToken: string;
};

export type LoginResponse = {
  accessToken: string;
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isActive: boolean;
  };
};

export type RegisterResponse = {
  accessToken: string;
  user: User;
};
