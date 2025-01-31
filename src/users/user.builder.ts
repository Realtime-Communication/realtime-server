import { UtilService } from 'src/utils/common.util';
import { CreateUserDto, CreateUserDtoBuilder } from './request/create-user.dto';
import { SUser, SUserBuilder } from './schemas/user.schema';
import { IUser } from './user.interface';
import { UserResponse, UserResponseBuilder } from './response/user-data.response';

export class UserBuilder {
  static async toSUser(userDto: CreateUserDto): Promise<SUser> {
    return new SUserBuilder()
      .setEmail(userDto.email)
      .setPassword(await UtilService.hashingPassword(userDto.password))
      .setPassword_key(userDto.passwordKey)
      .setUsername(userDto.username)
      .setName(userDto.name)
      .setAbout(userDto.about)
      .setBirthday(userDto.birthday)
      .setHeight(userDto.height)
      .setWeight(userDto.weight)
      .setPhone(userDto.phone)
      .setDeleted(userDto.deleted)
      .setRoles(userDto.roles)
      .setFriends(userDto.friends)
      .setGroups(userDto.groups)
      .setImage(userDto.image)
      .setActive(userDto.active)
      .build();
  }

  static toUserReponse(user: SUser): UserResponse {
    return new UserResponseBuilder()
      .setEmail(user.email)
      .setUsername(user.username)
      .setName(user.name)
      .setAbout(user.about)
      .setBirthday(user.birthday)
      .setHeight(user.height)
      .setWeight(user.weight)
      .setPhone(user.phone)
      .setDeleted(user.deleted)
      .setRoles(user.roles)
      .setFriends(user.friends)
      .setGroups(user.groups)
      .setImage(user.image)
      .setActive(user.active)
      .build();
  }
}
