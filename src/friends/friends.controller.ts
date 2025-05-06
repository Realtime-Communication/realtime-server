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
import { CreateFriendDto } from './dto/create-friend.dto';
import { UpdateFriendDto } from './dto/update-friend.dto';
import { Pageable } from 'src/common/pagination/pageable.dto';
import {
  AccountRequest,
  TAccountRequest,
} from 'src/decorators/account-request.decorator';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post()
  create(
    @AccountRequest() account: TAccountRequest,
    @Body() createFriendDto: CreateFriendDto,
  ) {
    return this.friendsService.create(account, createFriendDto);
  }

  @Get()
  findAll(
    @AccountRequest() account: TAccountRequest,
    @Query() pageable: Pageable,
  ) {
    return this.friendsService.findAll(account, pageable);
  }

  @Get('/:id')
  findOne(@AccountRequest() account: TAccountRequest, @Param('id') id: number) {
    return this.friendsService.findFriend(account, id);
  }

  @Patch(':id')
  update(
    @AccountRequest() account: TAccountRequest,
    @Param('id') id: string,
    @Body() updateFriendDto: UpdateFriendDto,
  ) {
    return this.friendsService.update(account, +id, updateFriendDto);
  }

  @Delete(':id')
  remove(@AccountRequest() account: TAccountRequest, @Param('id') id: string) {
    return this.friendsService.remove(account, +id);
  }
}
