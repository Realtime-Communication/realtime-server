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
import { Pageable } from 'src/common/pagination/pageable.dto';
import {
  AccountRequest,
  TAccountRequest,
} from 'src/decorators/account-request.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

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
    @Query() pageable: Pageable,
  ) {
    return this.friendsService.findAll(account, pageable);
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
}
