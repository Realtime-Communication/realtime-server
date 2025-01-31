import { BadRequestException, Injectable } from '@nestjs/common';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { IUser } from './user.interface';
import { UserRepository } from './users.repository';
import { SUser } from './schemas/user.schema';
import { CreateUserDto } from './request/create-user.dto';
import { UserBuilder } from './user.builder';
import { UserResponse } from './response/user-data.response';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(SUser.name)
    private readonly userRepository: UserRepository,
  ) {}

  async emailExist(email: string, id?: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      email: email.toLowerCase(),
      deleted: false,
    });
    return user && id != user.id;
  }

  async addUser(createUserDto: CreateUserDto): Promise<UserResponse> {
    if (await this.emailExist(createUserDto.email))
      throw new BadRequestException('User email has exist !');
    return UserBuilder.toSUser(createUserDto)
      .then(this.userRepository.save)
      .then(UserBuilder.toUserReponse);
  }

  // async friends(user: IUser) {
  //   try {
  //     const users = await this.userModel
  //       .find({
  //         _id: { $nin: [user._id] },
  //         deleted: false,
  //       })
  //       .select('-password -createdAt');
  //     return users;
  //   } catch (error) {
  //     return this.helpersService.responseError(
  //       'cannot get all friend at user service',
  //     );
  //   }
  // }

  // async findOne(id: string) {
  //     return this.userRepository
  //       .findUserForValidate({
  //         _id: id,
  //         deleted: false,
  //       })
  // }

  async findByEmail(email: string): Promise<SUser> {
    return this.userRepository.findOne({
      email: email,
      deleted: false,
    });
  }

  // async update(id: string, updateUserDto: any) {
  //   try {
  //     if (await this.emailExist(updateUserDto.email, id)) {
  //       updateUserDto.password = await this.helpersService.hashingPassword(
  //         updateUserDto.password,
  //       );
  //       await this.userModel.updateOne(
  //         { _id: id, deleted: false },
  //         { $set: updateUserDto },
  //       );
  //       return this.helpersService.responeSuccess('Update success !');
  //     } else return this.helpersService.responseError('User email has exist !');
  //   } catch (error) {
  //     return this.helpersService.responseError('Cannot update user !');
  //   }
  // }

  // async remove(id: string) {
  //   try {
  //     // if(!mongoose.Types.ObjectId.isValid(id)) return this.helpersService.responseError("User not exist on system");
  //     await this.userModel.updateOne({ _id: id }, { $set: { deleted: true } });
  //     return this.helpersService.responeSuccess('delete success');
  //   } catch (error) {
  //     return error;
  //   }
  // }
}
