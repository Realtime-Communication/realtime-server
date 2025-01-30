import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BaseSchema } from 'src/base/base.schema';
import { Builder, createBuilderClass } from 'builder-pattern-2';

export type SUserDocument = HydratedDocument<SUser>;

interface SUserCtor {
  email: string;
  password: string;
  password_key: string;
  username: string;
  name: string;
  about?: string;
  birthday?: Date;
  height?: number;
  weight?: number;
  phone?: number;
  deleted?: boolean;
  roles?: string[];
  friends?: string[];
  groups?: string[];
  image?: string;
  active?: boolean;
}

@Schema()
export class SUser extends BaseSchema {
  
  constructor(partial: Partial<SUserCtor>) {
    super();
    Object.assign(this, partial);
  }

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({
    required: true,
    select: false,
  })
  passwordKey: string;

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

export const SUserSchema = SchemaFactory.createForClass(SUser);
export const SUserBuilder: Builder<SUser, SUserCtor> = createBuilderClass<SUser, SUserCtor>(SUser);
