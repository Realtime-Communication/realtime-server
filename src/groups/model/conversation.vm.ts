export class ConversationVm {
  id: number;
  title: string;
  creator_id: number;
  channel_id: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;

  participants?: {
    id: number;
    user_id: number;
    type: 'lead' | 'member';
  }[];
}
