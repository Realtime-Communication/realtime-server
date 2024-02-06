import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChatDocument = HydratedDocument<Chat>;

class Message {
    id: string;
    message: string;
    constructor(id: string, message: string){
      this.id = id;
      this.message = message;
    }
}

@Schema({ timestamps: true })
export class Chat {
  save() {
  }

  @Prop()
  from: string;

  @Prop()
  from_id: string;

  @Prop()
  room_id: string;

  @Prop()
  to_id: string;

  @Prop()
  content: string;

  @Prop({
    default: false
  })
  deleted: boolean;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);