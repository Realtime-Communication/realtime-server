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
import { UserService } from './users.service';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/roles/role.enum';
import { Public } from 'src/decorators/public.decorator';
import { IUser } from './user.interface';
import { User } from 'src/decorators/user.decorator';
import mongoose from 'mongoose';
import { CreateUserDto } from './request/create-user.dto';
import { UserResponse } from './response/user-data.response';

@Controller('users')
export class UsersController {
  constructor(
    private readonly userService: UserService
  ) {}

  @Public()
  @Post('/register')
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    return this.userService.addUser(createUserDto);
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
