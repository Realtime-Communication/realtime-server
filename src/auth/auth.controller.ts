import { Body, Controller, Get, Post, Render, Req, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from 'src/decorators/public.decorator';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from './../users/users.service';


@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private readonly authService: AuthService,
  ){}

  @Public()
  @Post('/login')
  @UseGuards(LocalAuthGuard)
  async handleLogin(@Request() req){
    return this.authService.login(req.user._doc);
  }

  @Public()
  @Post('/register')
  async handleRegister(@Body() createUserDto) {
    return this.authService.register(createUserDto);
  }
}