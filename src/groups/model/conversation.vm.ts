import { User } from "@prisma/client";
import { MessageVm } from "src/chat/dto/message.vm";
import { UserVm } from "src/users/users.vm";

export enum ConversationType {
GROUP ,
FRIEND
}

export class ConversationVm {
  id: number;
  title: string;
  creatorId: number;
  channelId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  conversationType: ConversationType
  lastMessage: MessageVm

  participants?: {
    id: number;
    userId: number;
    type: 'lead' | 'member';
    user?: Partial<UserVm>
  }[];
}
