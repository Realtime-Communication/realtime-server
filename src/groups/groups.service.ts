import { Injectable } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Group } from './schemas/group.schema';
import mongoose, { Model } from 'mongoose';
import { IUser } from 'src/users/user.interface';
import { HelpersService } from 'src/helpers/helpers.service';
import { ResponseMessage } from 'src/decorators/responseMessage.decorator';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name)
    private readonly groupModel: Model<Group>,
    private readonly helpersService: HelpersService
  ) {}

  async create(createGroupDto: CreateGroupDto, user: IUser) {
    try {
      createGroupDto.leader = user._id;
      createGroupDto.members = [...[user._id]];
      return await this.groupModel.create(createGroupDto);
    } catch (error) {
      return this.helpersService.responseError('Cannot create new group');
    }
  }

  @ResponseMessage('Get all my groups')
  async myGroups(user: IUser) {
    try {
      return await this.groupModel.find({ members: { $elemMatch: { $eq: user._id } } });
    } catch (error) {
      return error;
    }
  }

  async findOne(id: string) {
    try {
      return await this.groupModel.findOne({
        _id: id,
        deleted: false
      })
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
      return await this.groupModel.find({
        members: {$in: user._id},
        deleted: false
      }).select('_id')
    } catch (error) {
      return error;
    }
  }
}
