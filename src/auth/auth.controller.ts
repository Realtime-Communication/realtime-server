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
import { ApiCreatedResponse } from '@nestjs/swagger';
import { LoginRequest } from './dto/login.dto';
import { ResponseMessage } from 'src/decorators/response-message.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('/login')
  @ResponseMessage('Login success')
  async login(@Body() loginRequest: LoginRequest) {
    return await this.authService.login(loginRequest);
  }

  @Public()
  @Post('/register')
  @ResponseMessage('Register success')
  async register(@Body() createUserDto: CreateUserDto) {
    return await this.authService.create(createUserDto);
  }
}
