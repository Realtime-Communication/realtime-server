import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from 'src/base/base.schema';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User extends BaseSchema {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({
    required: true,
    select: false,
  })
  password_key: string;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  about: string;

  @Prop()
  birthday: Date;

  @Prop()
  height: number;

  @Prop()
  weight: number;

  @Prop()
  phone: number;

  @Prop({ default: false })
  deleted: boolean;

  @Prop()
  roles?: string[];

  @Prop()
  friends?: string[];

  @Prop({ type: [] })
  groups?: string[];

  @Prop()
  image?: string;

  @Prop({ default: true })
  active: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
