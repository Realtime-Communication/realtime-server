import { User } from '@prisma/client';

export class AccountVM {
  id: number;
  email: string;
  phone: string;
  role: string;
  isBlocked: boolean;
  isActive: boolean;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferences?: string;
  levelLeft?: number;
  levelRight?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class AccountListVM {
  items: AccountVM[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
} 
