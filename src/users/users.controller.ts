import { Controller, Get, Post, Body, Patch, Param, Delete, Request } from '@nestjs/common';
import { UsersService } from './users.service';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/roles/role.enum';
import { Public } from 'src/decorators/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post('/create')
  create(
    @Body()
    createUserDto: any
  ) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(
    @Request() req
  ) {
    return this.usersService.findAll(req.user.userId);
  }

  @Get('/:id')
  findOne(
    @Param('id') 
    id: string,
  ) {
    return this.usersService.findOne(id);
  }

  @Patch('/edit/:id')
  update(
    @Param('id') 
    id: string,
    @Body()
    updateUserDto: any
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete('/delete/:id')
  remove(
    @Param('id')
    id: string
  ) {
    return this.usersService.remove(id);
  }
}
