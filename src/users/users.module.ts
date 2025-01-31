import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRepository } from './users.repository';
import { SUser, SUserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SUser.name, schema: SUserSchema }])
  ],
  exports: [UserService],
  controllers: [UsersController],
  providers: [UserService, UserRepository],
}) export class UsersModule {}
