import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Conversation } from '@prisma/client';
import mongoose, { Schema as MongooseSchema } from 'mongoose';
import { ParticipantEntity } from './participant.entity';

export class ConversationEntity implements Conversation {
  id: string;
  title: string;
  creator_id: string;
  channel_id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date;
  participants: ParticipantEntity[]
}
