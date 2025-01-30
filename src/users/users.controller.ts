import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/roles/role.enum';
import { Public } from 'src/decorators/public.decorator';
import { IUser } from './user.interface';
import { User } from 'src/decorators/user.decorator';
import mongoose from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponse } from './user-data.response';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService
  ) {}

  @Public()
  @Post('/create')
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    return this.usersService.addUser(createUserDto);
  }

  @Get('/friends')
  friends(@User() user: IUser) {
    // return this.usersService.friends(user);
  }

  @Get('/:id')
  findOne(@Param('id') id: string) {
    // return this.usersService.findOne(id);
  }

  @Patch('/edit/:id')
  update(
    @Param('id')
    id: string,
    @Body()
    updateUserDto: any,
  ) {
    // return this.usersService.update(id, updateUserDto);
  }

  @Delete('/delete/:id')
  remove(
    @Param('id')
    id: string,
  ) {
    // return this.usersService.remove(id);
  }
}
