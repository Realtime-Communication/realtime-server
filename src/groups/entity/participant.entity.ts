import { $Enums, Participant } from "@prisma/client";

export class ParticipantEntity implements Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  type: $Enums.ParticipantType;
  created_at: Date;
  updated_at: Date;
}
