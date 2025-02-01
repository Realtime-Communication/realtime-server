import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SMessage } from './chat/schemas/message.shema';
import { UtilService } from './utils/security.util';
import { Model } from 'mongoose';

@Injectable()
export class AppService {
  constructor() {}
  getHello(): string {
    return 'Hello World!';
  }
}
