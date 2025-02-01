import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async emailExist(email: string, id?: string): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
    return user && id != user.id;
  }

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    if (await this.emailExist(createUserDto.email))
      throw new BadRequestException('User email has exist !');
    return this.prismaService.user.create({ data: createUserDto });
  }

  async findOne(id: string): Promise<UserEntity> {
    return await this.prismaService.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity> {
    return await this.prismaService.user.findUnique({ where: { email: email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.prismaService.user.update({
      where: { id },
      data: updateUserDto,
    });
    return new UserEntity(user);
  }

  async remove(id: string): Promise<UserEntity> {
    const user = await this.prismaService.user.delete({
      where: { id },
    });
    return new UserEntity(user);
  }
}
