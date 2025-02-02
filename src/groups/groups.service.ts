import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { Conversation, ParticipantType } from '@prisma/client';
import { ConversationEntity } from './entity/conversation.entity';

@Injectable()
export class ConversationService {
  constructor(private readonly prismaService: PrismaService) {}

  async createConversation(
    createConversationDto: CreateConversationDto,
    account: TAccountRequest,
  ): Promise<ConversationEntity> {
    validateCreateConversationRequest(createConversationDto, account);
    return await this.prismaService.conversation.create({
      data: {
        ...createConversationDto,
        participants: {
          create: {
            type: ParticipantType.member,
            user_id: account.id,
          },
        },
      },
      include: {
        participants: true,
      },
    });
  }

  @ResponseMessage('Get all my groups')
  async getGroupds(account: TAccountRequest): Promise<ConversationEntity> {
    return await this.prismaService.conversation.findMany({
      where: {
        participants: {
          some: {
            user_id: account.id,
          },
        },
      },
      include: {
        participants: true,
      },
    });
  }

  async findOne(id: string) {
    try {
      return await this.groupModel.findOne({
        _id: id,
        deleted: false,
      });
    } catch (error) {
      return error;
    }
  }

  update(id: string, updateGroupDto: UpdateGroupDto) {
    return `This action updates a #${id} group`;
  }

  remove(id: number) {
    return `This action removes a #${id} group`;
  }

  @ResponseMessage('Get all ids my groups')
  async idsMyGroups(user: IUser) {
    try {
      return await this.groupModel
        .find({
          members: { $in: user._id },
          deleted: false,
        })
        .select('_id');
    } catch (error) {
      return error;
    }
  }
}
function validateCreateConversationRequest(
  createConversationDto: CreateConversationDto,
  account: TAccountRequest,
) {
  if (!createConversationDto.title) {
    throw new Error('Conversation title is required');
  }
  if (!account || createConversationDto.creator_id != account.id) {
    throw new Error('Valid account is required');
  }
}
