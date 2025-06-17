import { ParticipantStatus, ParticipantType } from '@prisma/client';

export class ConversationVM {
  id: number;
  title: string;
  creatorId: number;
  channelId: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  avatarUrl: string;
  creator: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  participants: {
    id: number;
    conversationId: number;
    userId: number;
    type: ParticipantType;
    status: ParticipantStatus;
    createdAt: Date;
    updatedAt: Date;
    verifiedBy?: number;
    user: {
      id: number;
      firstName: string;
      lastName: string;
      email: string;
    };
  }[];
}

export class ConversationListVM {
  items: ConversationVM[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
} 
