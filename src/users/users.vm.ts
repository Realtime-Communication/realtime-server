import { AccountRole } from "@prisma/client";

export class UserVm {
  id: number;
  phone: string;
  email: string;
  password: string;
  firstName: string;
  middleName: string;
  lastName: string;
  isActive: boolean;
  isReported: boolean;
  isBlocked: boolean;
  type?: AccountRole;
  preferences: string;
  createdAt: Date;
  updatedAt: Date;
}
