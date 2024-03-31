import { Controller, Get, Post, Render, Req, Request, Res, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth/auth.service';
import { Public } from './decorators/public.decorator';
import { LocalAuthGuard } from './auth/local-auth.guard';

@Controller('')
export class AppController {
  constructor(
  ){}
}