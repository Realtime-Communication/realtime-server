import { Type } from "class-transformer";
import { ConversationActionType } from "./action.enum";
import { IsNumber } from "class-validator";

export class ConversationActionDto {
  @Type(() => Number)
  targetUserId: number;
  @Type(() => Number)
  conversationId: number;

}
