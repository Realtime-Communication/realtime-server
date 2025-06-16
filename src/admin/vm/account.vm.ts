import { AccountRole } from '@prisma/client';

export class AccountVM {
  id: number;
  phone: string;
  email: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  role: AccountRole;
  is_blocked: boolean;
  is_active: boolean;
  level_left?: number;
  level_right?: number;
  created_at: Date;
  updated_at: Date;
}

export class AccountListVM {
  items: AccountVM[];
  total: number;
} 
