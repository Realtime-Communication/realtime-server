import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { AddFriendDto } from './dto/create-friend.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';
import { FriendSearchDto } from './dto/friend-search.dto';
import { Pageable } from 'src/common/pagination/pageable.dto';
import {
  AccountRequest,
  TAccountRequest,
} from 'src/decorators/account-request.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Controller('friends')
export class FriendsController {
  constructor(
    private readonly friendsService: FriendsService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post()
  @ResponseMessage('Save message success')
  async addFriend(
    @AccountRequest() account: TAccountRequest,
    @Body() createFriendDto: AddFriendDto,
  ) {
    return this.friendsService.addFriend(account, createFriendDto);
  }

  @Get()
  async findAll(
    @AccountRequest() account: TAccountRequest,
    @Query() searchDto: FriendSearchDto,
  ) {
    return this.friendsService.findAll(account, searchDto);
  }

  @Get('/debug/all')
  async debugAllFriends(
    @AccountRequest() account: TAccountRequest,
  ) {
    // Get all friends without any filters for debugging
    const allFriends = await this.prismaService.friend.findMany({
      where: {
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

    return {
      accountId: account.id,
      totalFriends: allFriends.length,
      friends: allFriends.map(f => ({
        id: f.id,
        status: f.status,
        requester: {
          id: f.requester.id,
          name: `${f.requester.first_name} ${f.requester.last_name}`,
          email: f.requester.email,
        },
        receiver: {
          id: f.receiver.id,
          name: `${f.receiver.first_name} ${f.receiver.last_name}`,
          email: f.receiver.email,
        },
        isRequester: f.requester_id === account.id,
        isReceiver: f.receiver_id === account.id,
      }))
    };
  }

  @Get('/requested')
  async findAllRequestedFriend(
    @AccountRequest() account: TAccountRequest,
    @Query() pageable: Pageable,
  ) {
    return this.friendsService.findAllRequestedFriend(account, pageable);
  }

  @Get('/accepted')
  async findAllAcceptedFriend(
    @AccountRequest() account: TAccountRequest,
    @Query() pageable: Pageable,
  ) {
    return this.friendsService.findAllAcceptedFriend(account, pageable);
  }

  @Get('/:id')
  async findOne(
    @AccountRequest() account: TAccountRequest,
    @Param('id') id: number,
  ) {
    return this.friendsService.findFriend(account, id);
  }

  @Patch(':id')
  async update(
    @AccountRequest() account: TAccountRequest,
    @Param('id') id: string,
    @Body() updateFriendDto: UpdateFriendDto,
  ) {
    return this.friendsService.update(account, +id, updateFriendDto);
  }

  @Delete(':id')
  async remove(
    @AccountRequest() account: TAccountRequest,
    @Param('id') id: string,
  ) {
    return this.friendsService.remove(account, +id);
  }

  @Post('/:id/accept')
  @ResponseMessage('Friend request accepted successfully')
  async acceptFriendRequest(
    @AccountRequest() account: TAccountRequest,
    @Param('id') friendShipRequestId: number
  ) {
    return this.friendsService.acceptFriendRequest(account, friendShipRequestId);
  }

  @Post('/:id/reject')
  @ResponseMessage('Friend request rejected successfully')
  async rejectFriendRequest(
    @AccountRequest() account: TAccountRequest,
    @Param('id') friendShipRequestId: number
  ) {
    return this.friendsService.rejectFriendRequest(account, friendShipRequestId);
  }

  @Post('/:id/block')
  @ResponseMessage('Friend request blocked successfully')
  async blockFriendRequest(
    @AccountRequest() account: TAccountRequest,
    @Param('id') friendShipRequestId: number
  ) {
    return this.friendsService.blockFriendRequest(account, friendShipRequestId);
  }

  @Post('/:id/unblock')
  @ResponseMessage('Friend request unblocked successfully')
  async unblockFriendRequest(
    @AccountRequest() account: TAccountRequest,
    @Param('id') friendShipRequestId: number
  ) {
    return this.friendsService.unblockFriendRequest(account, friendShipRequestId);
  }

  @Post('/:id/unfriend')
  @ResponseMessage('Friend request unfriended successfully')
  async unfriendFriendRequest(
    @AccountRequest() account: TAccountRequest,
    @Param('id') friendId: number
  ) {
    return this.friendsService.unfriendFriendRequest(account, friendId);
  }
}
