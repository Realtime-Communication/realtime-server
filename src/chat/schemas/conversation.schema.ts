import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from 'src/base/base.schema';

export type SConversationDocument = HydratedDocument<SConversation>;

@Schema({ timestamps: true })
export class SConversation extends BaseSchema {
  @Prop()
  title: string;

  @Prop()
  creator_id: string;
}

export const SConversationSchema = SchemaFactory.createForClass(SConversation);
