import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type GroupDocument = HydratedDocument<Group>;

@Schema({ timestamps: true })
export class Group {
  @Prop()
  title: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SUser', required: true })
  creatorId: mongoose.Schema.Types.ObjectId;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt?: Date;

  @Prop()
  members: mongoose.Schema.Types.ObjectId[];

  @Prop({
    default: false
  })
  deleted: boolean;

  @Prop()
  image?: string;
  
}

export const GroupSchema = SchemaFactory.createForClass(Group);
