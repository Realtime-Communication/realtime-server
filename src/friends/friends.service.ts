import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AddFriendDto } from './dto/create-friend.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { FriendVm } from './dto/friend.vm';
import { PagedResponse } from 'src/common/pagination/paged.vm';
import { Pageable } from 'src/common/pagination/pageable.dto';
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { FriendStatus, ParticipantType } from '@prisma/client';

@Injectable()
export class FriendsService {
  constructor(private readonly prismaService: PrismaService) {}

  async addFriend(
    account: TAccountRequest,
    addFriendDto: AddFriendDto,
  ): Promise<FriendVm> {
    // Find the receiver user by email or id
    const receiver = await this.prismaService.user.findFirst({
      where: {
        OR: [
          ...(addFriendDto.email ? [{ email: addFriendDto.email }] : []),
          ...(addFriendDto.receiverId ? [{ id: addFriendDto.receiverId }] : []),
        ],
      },
    });

    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    if (receiver.id === account.id) {
      throw new BadRequestException('Cannot add yourself as friend');
    }

    // Check if friendship already exists
    const existingFriend = await this.prismaService.friend.findFirst({
      where: {
        OR: [
          {
            requester_id: account.id,
            receiver_id: receiver.id,
          },
          {
            requester_id: receiver.id,
            receiver_id: account.id,
          },
        ],
      },
    });

    if (existingFriend) {
      throw new BadRequestException('Friendship request already exists');
    }

    return await this.prismaService.$transaction(async (prisma) => {
      const friend = await this.prismaService.friend.create({
        data: {
          requester_id: account.id,
          receiver_id: receiver.id,
          status: FriendStatus.PENDING,
        },
        include: {
          requester: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              is_active: true,
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              is_active: true,
            },
          },
        },
      });

      await this.prismaService.conversation.create({
        data: {
          title: `${friend.requester.first_name} ${friend.requester.last_name} and ${friend.receiver.first_name} ${friend.receiver.last_name}`,
          channel_id: account.id + receiver.id,
          creator_id: account.id,
          avatar_url: 'sdfsdfsdfff.com', // NULL DEFAULT
          participants: {
            createMany: {
              data: [
                {
                  user_id: account.id,
                  type: ParticipantType.MEMBER,
                },
                {
                  user_id: receiver.id,
                  type: ParticipantType.MEMBER,
                },
              ],
            },
          },
        },
        include: {
          participants: true,
        },
      });
      return this.toFriendVm(friend);
    });
  }

  async acceptFriendRequest(
    account: TAccountRequest,
    friendShipRequestId: number,
  ): Promise<FriendVm> {
    const friend = await this.prismaService.friend.findFirst({
      where: {
        id: friendShipRequestId,
        receiver_id: account.id,
        status: FriendStatus.PENDING,
      },
      include: {
        requester: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_active: true,
          },
        },
        receiver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_active: true,
          },
        },
      },
    });

    if (!friend) {
      throw new NotFoundException(
        'Friend request not found or already processed',
      );
    }

    const updatedFriend = await this.prismaService.friend.update({
      where: { id: friendShipRequestId },
      data: { status: FriendStatus.ACCEPTED },
      include: {
        requester: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_active: true,
          },
        },
        receiver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_active: true,
          },
        },
      },
    });

    return this.toFriendVm(updatedFriend);
  }

  async getGroupIds(userId: number): Promise<number[]> {
    const participants = await this.prismaService.participant.findMany({
      where: {
        user_id: userId,
        conversation: {
          deleted_at: null,
        },
      },
      select: {
        conversation_id: true,
      },
    });

    return participants.map((p) => p.conversation_id);
  }

  async getFriendIds(userId: number): Promise<number[]> {
    const friends = await this.prismaService.friend.findMany({
      where: {
        OR: [{ requester_id: userId }, { receiver_id: userId }],
        status: FriendStatus.ACCEPTED,
      },
      select: {
        requester_id: true,
        receiver_id: true,
      },
    });

    return friends.map((friend) =>
      friend.requester_id === userId ? friend.receiver_id : friend.requester_id,
    );
  }

  async findAll(
    account: TAccountRequest,
    pageable: Pageable,
  ): Promise<PagedResponse<FriendVm>> {
    const [friends, total] = await Promise.all([
      this.prismaService.friend.findMany({
        where: {
          OR: [{ requester_id: account.id }, { receiver_id: account.id }],
          ...(pageable.search && {
            OR: [
              {
                requester: {
                  OR: [
                    {
                      first_name: {
                        contains: pageable.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      last_name: {
                        contains: pageable.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
              {
                receiver: {
                  OR: [
                    {
                      first_name: {
                        contains: pageable.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      last_name: {
                        contains: pageable.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        },
        include: {
          requester: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              is_active: true,
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              is_active: true,
            },
          },
        },
        take: pageable.size,
        skip: (pageable.page - 1) * pageable.size,
      }),
      this.prismaService.friend.count({
        where: {
          OR: [{ requester_id: account.id }, { receiver_id: account.id }],
        },
      }),
    ]);

    return {
      page: pageable.page,
      size: pageable.size,
      totalPage: Math.ceil(total / pageable.size),
      totalElement: total,
      result: friends.map(friend => this.toFriendVm(friend)),
    };
  }

  async findAllAcceptedFriend(
    account: TAccountRequest,
    pageable: Pageable,
  ): Promise<PagedResponse<FriendVm>> {
    const [friends, total] = await Promise.all([
      this.prismaService.friend.findMany({
        where: {
          OR: [{ requester_id: account.id }, { receiver_id: account.id }],
          status: FriendStatus.ACCEPTED,
          ...(pageable.search && {
            OR: [
              {
                requester: {
                  OR: [
                    {
                      first_name: {
                        contains: pageable.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      last_name: {
                        contains: pageable.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
              {
                receiver: {
                  OR: [
                    {
                      first_name: {
                        contains: pageable.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      last_name: {
                        contains: pageable.search,
                        mode: 'insensitive',
                      },
                    },
                  ],
                },
              },
            ],
          }),
        },
        include: {
          requester: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              is_active: true,
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              is_active: true,
            },
          },
        },
        take: pageable.size,
        skip: (pageable.page - 1) * pageable.size,
      }),
      this.prismaService.friend.count({
        where: {
          OR: [{ requester_id: account.id }, { receiver_id: account.id }],
          status: FriendStatus.ACCEPTED,
        },
      }),
    ]);

    return {
      page: pageable.page,
      size: pageable.size,
      totalPage: Math.ceil(total / pageable.size),
      totalElement: total,
      result: friends.map(friend => this.toFriendVm(friend)),
    };
  }

  async findAllRequestedFriend(
    account: TAccountRequest,
    pageable: Pageable,
  ): Promise<PagedResponse<FriendVm>> {
    const [friends, total] = await Promise.all([
      this.prismaService.friend.findMany({
        where: {
          receiver_id: account.id,
          status: FriendStatus.PENDING,
          ...(pageable.search && {
            requester: {
              OR: [
                {
                  first_name: {
                    contains: pageable.search,
                    mode: 'insensitive',
                  },
                },
                {
                  last_name: {
                    contains: pageable.search,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          }),
        },
        include: {
          requester: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              is_active: true,
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              is_active: true,
            },
          },
        },
        take: pageable.size,
        skip: (pageable.page - 1) * pageable.size,
      }),
      this.prismaService.friend.count({
        where: {
          receiver_id: account.id,
          status: FriendStatus.PENDING,
        },
      }),
    ]);

    return {
      page: pageable.page,
      size: pageable.size,
      totalPage: Math.ceil(total / pageable.size),
      totalElement: total,
      result: friends.map(friend => this.toFriendVm(friend)),
    };
  }

  async update(
    account: TAccountRequest,
    id: number,
    updateFriendDto: UpdateFriendDto,
  ): Promise<FriendVm> {
    const friend = await this.prismaService.friend.findFirst({
      where: {
        id,
        OR: [{ requester_id: account.id }, { receiver_id: account.id }],
      },
    });

    if (!friend) {
      throw new NotFoundException('Friend request not found');
    }

    // Only receiver can accept/reject
    if (friend.receiver_id !== account.id) {
      throw new BadRequestException(
        'Only receiver can update friend request status',
      );
    }

    const updatedFriend = await this.prismaService.friend.update({
      where: { id },
      data: {
        status: updateFriendDto.status,
      },
      include: {
        requester: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_active: true,
          },
        },
        receiver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_active: true,
          },
        },
      },
    });

    return this.toFriendVm(updatedFriend);
  }

  async remove(account: TAccountRequest, id: number): Promise<void> {
    const friend = await this.prismaService.friend.findFirst({
      where: {
        id,
        OR: [{ requester_id: account.id }, { receiver_id: account.id }],
      },
    });

    if (!friend) {
      throw new NotFoundException('Friend not found');
    }

    await this.prismaService.friend.delete({
      where: { id },
    });
  }

  async findFriend(account: TAccountRequest, id: number): Promise<FriendVm> {
    const friend = await this.prismaService.friend.findFirst({
      where: {
        id,
        OR: [{ requester_id: account.id }, { receiver_id: account.id }],
      },
      include: {
        requester: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_active: true,
          },
        },
        receiver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_active: true,
          },
        },
      },
    });

    if (!friend) {
      throw new NotFoundException('Friend relationship not found');
    }

    return this.toFriendVm(friend);
  }

  private toFriendVm(friend: any): FriendVm {
    return {
      id: friend.id,
      requesterId: friend.requester_id,
      receiverId: friend.receiver_id,
      status: friend.status,
      createdAt: friend.created_at,
      requester: friend.requester && {
        id: friend.requester.id,
        firstName: friend.requester.first_name,
        lastName: friend.requester.last_name,
        email: friend.requester.email,
        isActive: friend.requester.is_active,
      },
      receiver: friend.receiver && {
        id: friend.receiver.id,
        firstName: friend.receiver.first_name,
        lastName: friend.receiver.last_name,
        email: friend.receiver.email,
        isActive: friend.receiver.is_active,
      },
    };
  }
}
