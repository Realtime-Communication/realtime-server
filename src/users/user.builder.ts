import { HelpersService } from 'src/helpers/helpers.service';
import { CreateUserDto, CreateUserDtoBuilder } from './dto/create-user.dto';
import { SUser, SUserBuilder } from './schemas/user.schema';

export class UserBuilder {
  static with(userDto: CreateUserDto): SUser {
    return new SUserBuilder()
      .setEmail(userDto.email)
      .setPassword(HelpersService.hashingPassword(userDto.password))
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

  static from(user: SUser): CreateUserDto {
    return new CreateUserDtoBuilder()
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
