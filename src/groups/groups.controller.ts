import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-conversation.dto';
import { UpdateGroupDto } from './dto/update-conversation.dto';
import { AccountRequest, TAccountRequest, User } from 'src/decorators/account-request.decorator';
import { IUser } from 'src/users/user.interface';
import mongoose from 'mongoose';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
  ) {}

  @Post('/create')
  create(@Body() createGroupDto: CreateGroupDto, @AccountRequest() account: TAccountRequest) {
    return this.groupsService.create(createGroupDto, account);
  }

  @Get('/mygroups')
  findAll(
    @User() user: IUser
  ) {
    return this.groupsService.myGroups(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupsService.update(id, updateGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupsService.remove(+id);
  }
}
