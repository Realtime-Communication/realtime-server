import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  save() {
    throw new Error('Method not implemented.');
  }
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  address: string;

  @Prop()
  phone: number;

  @Prop()
  createdAt: Date

  @Prop()
  updatedAt?: Date

  @Prop({ default: false })
  deleted: Boolean

  @Prop()
  roles?: string[];

  @Prop()
  friends?: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);