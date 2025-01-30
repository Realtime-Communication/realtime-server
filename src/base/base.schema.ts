import { Prop, SchemaFactory, Schema as NestSchema, Schema } from '@nestjs/mongoose';
import { Binary, UUID } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { HydratedDocument } from 'mongoose';

export type BaseDocument = HydratedDocument<BaseSchema>;

@Schema({
  timestamps: true,
  versionKey: false
})
export class BaseSchema {
  @Prop({
    type: Buffer, // Store UUID as BSON Binary (Subtype 4)
    default: () => new Binary(Buffer.from(uuidv4().replace(/-/g, ""), "hex"), UUID.SUBTYPE_UUID),
    required: true,
  })
  _id: Binary; // BSON Binary UUID

  @Prop({ default: new Date() })
  createdAt?: Date;

  @Prop({ default: new Date() })
  updatedAt?: Date;
}

export const BaseSchemaModel = SchemaFactory.createForClass(BaseSchema);
