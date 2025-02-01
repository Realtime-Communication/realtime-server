import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  exports: [UserService],
  controllers: [UsersController],
  providers: [UserService],
})
export class UsersModule {}
