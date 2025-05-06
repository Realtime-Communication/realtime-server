import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateFriendDto } from './dto/create-friend.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { FriendVm } from './dto/friend.vm';
import { PagedResponse } from 'src/common/pagination/paged.vm';
import { Pageable } from 'src/common/pagination/pageable.dto';
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { FriendStatus } from '@prisma/client';

@Injectable()
export class FriendsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    account: TAccountRequest,
    createFriendDto: CreateFriendDto,
  ): Promise<FriendVm> {
    // Check if friendship already exists
    const existingFriend = await this.prismaService.friend.findFirst({
      where: {
        OR: [
          {
            requester_id: account.id,
            receiver_id: createFriendDto.receiver_id,
          },
          {
            requester_id: createFriendDto.receiver_id,
            receiver_id: account.id,
          },
        ],
      },
    });

    if (existingFriend) {
      throw new BadRequestException('Friendship request already exists');
    }

    const friend = await this.prismaService.friend.create({
      data: {
        requester_id: account.id,
        receiver_id: createFriendDto.receiver_id,
        status: FriendStatus.PENDING,
      },
      include: {
        requester: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return {
      ...friend,
      // updated_at: friend.created_at,
      // isFriend: friend.status === FriendStatus.ACCEPTED,
      // isPending: friend.status === FriendStatus.PENDING,
      // isRejected: friend.status === FriendStatus.REJECTED,
      // getOtherUser: () => friend.requester_id === account.id ? friend.receiver : friend.requester,
    };
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
            },
          },
          receiver: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
        take: pageable.limit,
        skip: (pageable.page - 1) * pageable.limit,
      }),
      this.prismaService.friend.count({
        where: {
          OR: [{ requester_id: account.id }, { receiver_id: account.id }],
        },
      }),
    ]);

    const x: FriendVm[] = friends;
    console.log(x);

    return {
      cursor: pageable.cursor,
      page: pageable.page,
      size: pageable.limit,
      totalPage: Math.ceil(total / pageable.limit),
      totalElement: total,
      result: friends,
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

    return await this.prismaService.friend.update({
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
          },
        },
        receiver: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });
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

    return friend;
  }
}
