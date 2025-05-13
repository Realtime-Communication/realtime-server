import { FriendStatus } from '@prisma/client';

interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive?: boolean;
}

export class FriendVm {
  id: number;
  requesterId: number;
  receiverId: number;
  status: FriendStatus;
  createdAt: Date;

  requester: UserInfo;
  receiver: UserInfo;
}
