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
}
