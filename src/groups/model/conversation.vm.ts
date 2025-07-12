import { User } from "@prisma/client";
import { MessageResponseDto } from "src/chat/dto/message.dto";
import { UserVm } from "src/users/users.vm";

export enum ConversationType {
GROUP ,
FRIEND
}

export interface ParticipantUserVm {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
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
  lastMessage: MessageResponseDto
  avatarUrl?: string;

  participants: {
    id: number;
    userId: number;
    type: 'LEAD' | 'MEMBER';
    user: ParticipantUserVm;
  }[];
}
