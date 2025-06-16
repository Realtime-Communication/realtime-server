export class ConversationVM {
  id: number;
  title: string;
  creator_id: number;
  channel_id: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  avatar_url: string;
  creator: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  participants: {
    id: number;
    user: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
    type: string;
    status: string;
  }[];
}

export class ConversationListVM {
  items: ConversationVM[];
  total: number;
} 
