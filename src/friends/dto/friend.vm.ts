import { FriendStatus } from './create-friend.dto';

export class FriendVm {
  id: number;
  requester_id: number;
  receiver_id: number;
  status: FriendStatus;
  created_at: Date;

  requester?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };

  receiver?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}
