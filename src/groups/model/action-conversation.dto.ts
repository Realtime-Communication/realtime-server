import { ConversationActionType } from "./action.enum";

export class ConversationActionDto {
  targetUserId: number;
  conversationId: number;
  actionType: ConversationActionType
}
