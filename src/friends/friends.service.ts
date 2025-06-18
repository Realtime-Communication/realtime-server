import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AddFriendDto } from './dto/create-friend.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { FriendVm } from './dto/friend.vm';
import { PagedResponse } from 'src/common/pagination/paged.vm';
import { Pageable } from 'src/common/pagination/pageable.dto';
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { FriendStatus, ParticipantType, Prisma } from '@prisma/client';
import { FriendSearchDto } from './dto/friend-search.dto';

type FriendWithRelations = Prisma.FriendGetPayload<{
  include: {
    requester: { select: { id: true; first_name: true; last_name: true; email: true; is_active?: boolean } };
    receiver: { select: { id: true; first_name: true; last_name: true; email: true; is_active?: boolean } };
  };
}>;

@Injectable()
export class FriendsService {
  async rejectFriendRequest(account: TAccountRequest, friendShipRequestId: number) {
    // Only the receiver can reject a friend request
    const friendRequest = await this.prismaService.friend.findUnique({
      where: { id: friendShipRequestId, receiver_id: account.id, status: 'PENDING' },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found or already processed');
    }

    await this.prismaService.friend.update({
      where: { id: friendShipRequestId },
      data: { status: 'REJECTED' },
    });

    return { success: true, message: 'Friend request rejected' };
  }

  async blockFriendRequest(account: TAccountRequest, friendShipRequestId: number) {
    // First find the friend request
    const friendRequest = await this.prismaService.friend.findUnique({
      where: { id: friendShipRequestId },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    // Check if the current user is either the requester or receiver
    if (friendRequest.requester_id !== account.id && friendRequest.receiver_id !== account.id) {
      throw new ForbiddenException('You are not authorized to block this request');
    }

    // Find the other user's ID
    const otherUserId = friendRequest.requester_id === account.id
      ? friendRequest.receiver_id
      : friendRequest.requester_id;

    // Block the user
    // Check if already blocked
    const existingBlock = await this.prismaService.blockList.findFirst({
      where: {
        user_id: account.id,
        participant_id: otherUserId
      }
    });

    // Only create if not already blocked
    if (!existingBlock) {
      await this.prismaService.blockList.create({
        data: {
          user_id: account.id,
          participant_id: otherUserId
        }
      });
    }

    // Delete the friend request/relationship
    await this.prismaService.friend.delete({
      where: { id: friendShipRequestId },
    });

    return { success: true, message: 'User blocked successfully' };
  }

  async unblockFriendRequest(account: TAccountRequest, blockedUserId: number) {
    // Remove from block list
    await this.prismaService.blockList.deleteMany({
      where: {
        user_id: account.id,
        participant_id: blockedUserId
      }
    });

    return { success: true, message: 'User unblocked successfully' };
  }

  async unfriendFriendRequest(account: TAccountRequest, friendId: number) {
    // Find the friend relationship where the current user is either requester or receiver
    // and the other user is the friendId
    const friendRequest = await this.prismaService.friend.findFirst({
      where: {
        OR: [
          {
            requester_id: account.id,
            receiver_id: friendId,
          },
          {
            requester_id: friendId,
            receiver_id: account.id,
          },
        ],
      },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend relationship not found');
    }

    // Delete the friend relationship
    await this.prismaService.friend.delete({
      where: { id: friendRequest.id },
    });

    return { success: true, message: 'Friend removed successfully' };
  }


  constructor(private readonly prismaService: PrismaService) { }

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
      const friend = await prisma.friend.create({
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

      await prisma.conversation.create({
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
    searchDto: FriendSearchDto,
  ): Promise<PagedResponse<FriendVm>> {
    console.log('🔍 Friend search debug:', {
      accountId: account.id,
      search: searchDto.search,
      searchFields: searchDto.searchFields,
      status: searchDto.status,
      page: searchDto.page,
      size: searchDto.size
    });

    // Define searchable fields for friend search
    const searchableFields = [
      'first_name',
      'last_name',
      'email'
    ];

    // Field mapping from camelCase to snake_case
    const fieldMapping: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      createdAt: 'created_at',
      requesterId: 'requester_id',
      receiverId: 'receiver_id'
    };

    // Ensure searchFields is always an array
    const searchFields = Array.isArray(searchDto.searchFields) ? searchDto.searchFields : [];

    // Build the base where clause
    const baseWhere: Prisma.FriendWhereInput = {
      OR: [{ requester_id: account.id }, { receiver_id: account.id }],
      status: { not: 'REJECTED' }
    };

    // Add status filter if provided
    if (searchDto.status) {
      baseWhere.status = searchDto.status;
    }

    // Add search filter if search term is provided
    if (searchDto.search && searchDto.search.trim()) {
      const searchTerm = searchDto.search.trim();
      console.log('🔍 Search term:', searchTerm);
      
      // If specific search fields are provided, use them
      if (searchFields.length > 0) {
        const validSearchFields = searchFields
          .filter(field => searchableFields.includes(fieldMapping[field] || field))
          .map(field => fieldMapping[field] || field);

        console.log('🔍 Valid search fields:', validSearchFields);

        if (validSearchFields.length > 0) {
          // Combine user filter with search filter
          baseWhere.AND = [
            { OR: [{ requester_id: account.id }, { receiver_id: account.id }] },
            {
              OR: [
                {
                  requester: {
                    OR: validSearchFields.map(field => ({
                      [field]: { contains: searchTerm, mode: 'insensitive' }
                    }))
                  },
                },
                {
                  receiver: {
                    OR: validSearchFields.map(field => ({
                      [field]: { contains: searchTerm, mode: 'insensitive' }
                    }))
                  },
                },
              ],
            }
          ];
          // Remove the original OR clause since we're using AND now
          delete baseWhere.OR;
        }
      } else {
        // Default search across all searchable fields
        console.log('🔍 Using default search fields');
        // Combine user filter with search filter
        baseWhere.AND = [
          { OR: [{ requester_id: account.id }, { receiver_id: account.id }] },
          {
            OR: [
              {
                requester: {
                  OR: [
                    { first_name: { contains: searchTerm, mode: 'insensitive' } },
                    { last_name: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                  ],
                },
              },
              {
                receiver: {
                  OR: [
                    { first_name: { contains: searchTerm, mode: 'insensitive' } },
                    { last_name: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        ];
        // Remove the original OR clause since we're using AND now
        delete baseWhere.OR;
      }
    }

    console.log('🔍 Final where clause:', JSON.stringify(baseWhere, null, 2));

    // Set default ordering if not provided
    let orderBy: Prisma.FriendOrderByWithRelationInput = { created_at: 'desc' };
    let shouldSortByName = false;
    let nameSortDirection: 'asc' | 'desc' = 'asc';
    
    if (searchDto.order) {
      const [field, direction] = searchDto.order.split(',');
      const mappedField = fieldMapping[field] || field;
      
      if (mappedField === 'name') {
        // For ordering by name, we'll handle it in the application layer
        shouldSortByName = true;
        nameSortDirection = direction === 'asc' ? 'asc' : 'desc';
        orderBy = { created_at: 'desc' }; // Default ordering for database query
      } else {
        // Check if the field exists in the Friend model
        const validFields = ['id', 'requester_id', 'receiver_id', 'status', 'created_at'];
        if (validFields.includes(mappedField)) {
          orderBy = {
            [mappedField]: direction === 'asc' ? 'asc' : 'desc'
          } as Prisma.FriendOrderByWithRelationInput;
        } else {
          // Default to created_at if field is not valid
          orderBy = { created_at: 'desc' };
        }
      }
    }

    const skip = (searchDto.page - 1) * searchDto.size;
    const take = searchDto.size;

    const [friends, total] = await Promise.all([
      this.prismaService.friend.findMany({
        where: baseWhere,
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
        take,
        skip,
        orderBy,
      }),
      this.prismaService.friend.count({ where: baseWhere }),
    ]);

    console.log('🔍 Search results:', {
      total,
      found: friends.length,
      friends: friends.map(f => ({
        id: f.id,
        status: f.status,
        requester: `${f.requester.first_name} ${f.requester.last_name}`,
        receiver: `${f.receiver.first_name} ${f.receiver.last_name}`,
        isRequester: f.requester_id === account.id
      }))
    });

    // Handle name sorting in application layer if requested
    let sortedFriends = friends;
    if (shouldSortByName) {
      sortedFriends = friends.sort((a, b) => {
        const getFriendName = (friend: any) => {
          // Determine which user is the friend (not the current user)
          const friendUser = friend.requester_id === account.id ? friend.receiver : friend.requester;
          return `${friendUser.first_name} ${friendUser.last_name}`.toLowerCase();
        };

        const nameA = getFriendName(a);
        const nameB = getFriendName(b);

        if (nameSortDirection === 'asc') {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      });
    }

    const totalPages = Math.ceil(total / take);

    return {
      page: searchDto.page,
      size: searchDto.size,
      totalPage: totalPages,
      totalElement: total,
      result: sortedFriends.map(friend => this.toFriendVm(friend)),
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
