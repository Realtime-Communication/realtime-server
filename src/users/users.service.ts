import { BadRequestException, Injectable } from '@nestjs/common';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { HelpersService } from 'src/helpers/helpers.service';
import { User } from './schemas/user.schema';
import { IUser } from './user.interface';

@Injectable()
export class UsersService {
  
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly helpersService: HelpersService
  ) {}

  async emailExist (email: string, id?: string): Promise<boolean> {
    try {
      email = email.toLowerCase();
      const user = await this.userModel.findOne({ email: email, deleted: false});
      if (!user || id == user.id) return true;
      else return false;
    } catch (error) {
      console.log(error);
    }
    return false;
  }

  async create(createUserDto: any) {
    if (await this.emailExist(createUserDto.email)) {
      createUserDto.email = createUserDto.email.toLowerCase();
      createUserDto.password = await this.helpersService.hashingPassword(createUserDto.password);
      const createUser = new this.userModel(createUserDto);
      await createUser.save();
      return createUserDto;
    } else throw new BadRequestException("User email has exist !");
  }

  async friends( user: IUser ) {
    try {
      const users = await this.userModel.find({
        _id: { $nin: [user._id] },
        deleted: false
      }).select("-password -createdAt");
      return users;
    } catch (error) {
      return this.helpersService.responseError('cannot get all friend at user service');
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.userModel.findOne({
        _id: id,
        deleted: false,
      }).select("-token -password -createdAt");
      return user;
    } catch (error) {
      return error;
    }
  }

  async findByEmail(email: string) {
      const user = await this.userModel.findOne({
        email: email,
        deleted: false
      }).select("-createdAt");
      return user;
  }

  async update(id: string, updateUserDto: any) {
    try {
      // if(!mongoose.Types.ObjectId.isValid(id)) return this.helpersService.responseError("User not exist on system");
      if (await this.emailExist(updateUserDto.email, id)) {
        updateUserDto.password = await this.helpersService.hashingPassword(updateUserDto.password);
        await this.userModel.updateOne(
          { _id: id, deleted: false },
          { $set: updateUserDto}
        )
        return this.helpersService.responeSuccess("Update success !");
      } else return this.helpersService.responseError("User email has exist !");
    } catch (error) {
      return this.helpersService.responseError("Cannot update user !");
    }
  }

  async remove(id: string) {
    try {
      // if(!mongoose.Types.ObjectId.isValid(id)) return this.helpersService.responseError("User not exist on system");
      await this.userModel.updateOne(
        { _id: id},
        { $set: { deleted: true } }
      )
      return this.helpersService.responeSuccess("delete success");
    } catch (error) {
      return error;
    }
  }
}