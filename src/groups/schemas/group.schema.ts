import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type GroupDocument = HydratedDocument<Group>;

@Schema({ timestamps: true })
export class Group {

  @Prop()
  name: string;

  @Prop()
  leader: mongoose.Schema.Types.ObjectId;

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