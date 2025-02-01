import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Binary } from 'mongodb';
import { HydratedDocument, Schema as MongooseSchema  } from 'mongoose';
import { BaseSchema } from 'src/common/base/base.schema';
import { SConversation } from './conversation.schema';
import { SUser } from 'src/users/schemas/user.schema';

export type ChatDocument = HydratedDocument<SMessage>;

@Schema({ timestamps: true })
export class SMessage extends BaseSchema {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SConversation', required: true })
  conversation: SConversation;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SUser', required: true })
  sender: SUser;

  @Prop()
  messageType: Enumerator<string>;

  @Prop()
  message: string;
}

export const SMessageSchema = SchemaFactory.createForClass(SMessage);
