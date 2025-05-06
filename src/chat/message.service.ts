import { Inject, Injectable, Scope } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { MessageDto } from './dto/create-message.dto';
import { CallStatus, CallType, MessageStatus } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private readonly prismaService: PrismaService) {}

  async saveMessage(account: TAccountRequest, messageDto: MessageDto) {
    const conversation = await this.prismaService.conversation.findFirst({
      where: {
        id: messageDto.conversation_id,
        deleted_at: null,
        participants: {
          some: {
            user_id: account.id,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const message = await this.prismaService.message.create({
      data: {
        guid: messageDto.guid,
        conversation_id: messageDto.conversation_id,
        sender_id: account.id,
        message_type: messageDto.message_type,
        content: messageDto.content || '',
        call_type: messageDto.call_type || CallType.voice,
        callStatus: messageDto.callStatus || CallStatus.ENDED,
        status: messageDto.status || MessageStatus.sent,
        attachments: messageDto.attachments
          ? {
              create: messageDto.attachments.map((attachment) => ({
                thumb_url: attachment.thumb_url,
                file_url: attachment.file_url,
              })),
            }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        attachments: true,
      },
    });

    // Update conversation's last activity
    await this.prismaService.conversation.update({
      where: { id: messageDto.conversation_id },
      data: { updated_at: new Date() },
    });

    return message;
  }

  async deleteMessage(account: TAccountRequest, messageId: number) {
    // Find message and check permissions
    const message = await this.prismaService.message.findFirst({
      where: {
        id: messageId,
        deleted_at: null,
        conversation: {
          participants: {
            some: {
              user_id: account.id,
            },
          },
        },
      },
      include: {
        conversation: {
          select: {
            participants: {
              where: {
                user_id: account.id,
              },
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new Error('Message not found or access denied');
    }

    // Check if user is message sender or conversation leader
    const isLeader = message.conversation.participants[0]?.type === 'lead';
    const isSender = message.sender_id === account.id;

    if (!isLeader && !isSender) {
      throw new Error('You do not have permission to delete this message');
    }

    // Soft delete the message
    const deletedMessage = await this.prismaService.message.update({
      where: {
        id: messageId,
      },
      data: {
        deleted_at: new Date(),
        deleted_messages: {
          create: {
            user_id: account.id,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        deleted_messages: {
          where: {
            user_id: account.id,
          },
          select: {
            created_at: true,
          },
        },
      },
    });

    return {
      id: deletedMessage.id,
      deleted_at: deletedMessage.deleted_at,
      deleted_by: {
        id: account.id,
        deleted_at: deletedMessage.deleted_messages[0]?.created_at,
      },
    };
  }

  async validateConversationAccess(userId: number, conversationId: number): Promise<boolean> {
    const participant = await this.prismaService.participant.findFirst({
      where: {
        conversation_id: conversationId,
        user_id: userId,
        conversation: {
          deleted_at: null
        }
      }
    });
    
    return !!participant;
  }

  // async getMyChats(user_id: string) {
  //   try {
  //     const chats = await this.chatModel
  //       .find({
  //         $or: [{ from_id: user_id }, { to_id: user_id }],
  //         deleted: false,
  //       })
  //       .sort({ createdAt: 'asc' });
  //     return chats;
  //   } catch (error) {
  //     return this.helpersService.responseError(
  //       `cannot find chat of user ${user_id}`,
  //     );
  //   }
  // }

  // async conversations(user: IUser) {
  //   try {
  //     const friends = await this.usersService.friends(user);
  //     const conversations = await this.groupsService.myGroups(user);
  //     const result = [...[friends], ...[conversations]];
  //     return result;
  //   } catch (error) {
  //     return this.helpersService.responseError(
  //       'cannot get all friend at chat service',
  //     );
  //   }
  // }

  // @ResponseMessage('Get chat with friend or group')
  // async getChatWithId(
  //   to_id: string,
  //   limit: number,
  //   userId: mongoose.Schema.Types.ObjectId,
  // ) {
  //   try {
  //     const otherPerson = await this.usersService.findOne(to_id);
  //     const group = await this.groupsService.findOne(to_id);
  //     const chats = otherPerson
  //       ? await this.chatModel
  //           .find({
  //             $or: [
  //               { $and: [{ from_id: to_id }, { to_id: userId }] },
  //               { $and: [{ from_id: userId }, { to_id: to_id }] },
  //             ],
  //             deleted: false,
  //           })
  //           .sort({ createdAt: 'desc' })
  //           .limit(limit)
  //           .then((data) => data.reverse())
  //       : await this.chatModel
  //           .find({
  //             to_id: to_id,
  //             deleted: false,
  //           })
  //           .sort({ createdAt: 'desc' })
  //           .limit(limit)
  //           .then((data) => data.reverse());
  //     return {
  //       chats,
  //       otherName: otherPerson ? otherPerson['name'] : group['name'],
  //       otherImage: otherPerson ? otherPerson['image'] : group['image'],
  //     };
  //   } catch (error) {
  //     return error;
  //   }
  // }

  // async getChatGlobal(userId: any) {
  //   try {
  //     return [];
  //   } catch (error) {
  //     return this.helpersService.responseError(
  //       'cannot get chat global before !',
  //     );
  //   }
  // }

  // async getLastChats(user: IUser) {
  //   try {
  //     const userId = user._id;
  //     const myGroups = await this.groupsService.idsMyGroups(user);
  //     const groupIds = myGroups.map((item: any) => item._id);
  //     const friendIds = await this.userModel.distinct('_id');
  //     const ids = [[...friendIds], [...groupIds]];
  //     const resultId = [];
  //     const resultObj = [];
  //     for (const key in ids) {
  //       for (const id of ids[key]) {
  //         const [lastRecord] = await this.chatModel
  //           .find({
  //             $or:
  //               key == '0'
  //                 ? [
  //                     { from_id: userId, to_id: id },
  //                     { from_id: id, to_id: userId },
  //                   ]
  //                 : [{ to_id: id }],
  //             deleted: false,
  //           })
  //           .sort({ createdAt: 'desc' })
  //           .limit(1)
  //           .select('from_id content from msgTime');
  //         resultId.push(id);
  //         resultObj.push(lastRecord);
  //       }
  //     }
  //     return [resultId, resultObj];
  //   } catch (error) {
  //     this.helpersService.responseError(
  //       'cannot get last chat of another friends !',
  //     );
  //   }
  // }

  // async deleteChat(id: string) {
  //   try {
  //     return await this.chatModel.updateOne(
  //       { _id: id },
  //       { $set: { deleted: true },
  //     );
  //   } catch (error) {
  //     console.log('delete msg error');
  //     return this.helpersService.responseError('cannot delete message');
  //   }
  // }
}
