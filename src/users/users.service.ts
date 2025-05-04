import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserVm } from './users.vm';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async emailExist(email: string, id?: number): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
    return user && id != user.id;
  }

  async create(createUserDto: CreateUserDto): Promise<UserVm> {
    if (await this.emailExist(createUserDto.email))
      throw new BadRequestException('User email has exist !');
    return this.prismaService.user.create({
      data: {
        ...createUserDto,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async findOne(id: number): Promise<UserVm> {
    return await this.prismaService.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserVm> {
    return await this.prismaService.user.findUnique({
      where: { email: email },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserVm> {
    const user = await this.prismaService.user.update({
      where: { id },
      data: updateUserDto,
    });
    return user;
  }

  async remove(id: number): Promise<UserVm> {
    const user = await this.prismaService.user.delete({
      where: { id },
    });
    return user;
  }
}
