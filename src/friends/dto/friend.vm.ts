import { FriendStatus } from "@prisma/client";

interface UserInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active?: boolean;
}

export class FriendVm {
  id: number;
  requester_id: number;
  receiver_id: number;
  status: FriendStatus;
  created_at: Date;

  requester: UserInfo;
  receiver: UserInfo;

  // Helper methods
  // functionisFriend(): boolean {
  //   return this.status === FriendStatus.ACCEPTED;
  // }

  // isPending(): boolean {
  //   return this.status === FriendStatus.PENDING;
  // }

  // isRejected(): boolean {
  //   return this.status === FriendStatus.REJECTED;
  // }

  // getOtherUser(userId: number): UserInfo {
  //   return userId === this.requester_id ? this.receiver : this.requester;
  // }
}
