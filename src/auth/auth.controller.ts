import {
  Body,
  Controller,
  Get,
  Post,
  Render,
  Req,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Public } from 'src/decorators/public.decorator';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UserService } from 'src/users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('/login')
  @UseGuards(LocalAuthGuard)
  async handleLogin(@Request() req) {
    return this.authService.login(req.user._doc);
  }

  @Public()
  @Post('/register')
  async handleRegister(@Body() createUserDto: CreateUserDto) {
    return this.userService.addUser(createUserDto);
  }
}
