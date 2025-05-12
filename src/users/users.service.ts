import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserVm } from './users.vm';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  private toUserVm(user: any): UserVm {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      password: user.password,
      firstName: user.first_name,
      middleName: user.middle_name,
      lastName: user.last_name,
      isActive: user.is_active,
      isReported: user.is_reported,
      isBlocked: user.is_blocked,
      preferences: user.preferences,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async findOne(id: number): Promise<UserVm> {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    return this.toUserVm(user);
  }

  async findByEmail(email: string): Promise<UserVm> {
    const user = await this.prismaService.user.findUnique({
      where: { email: email },
    });
    return this.toUserVm(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserVm> {
    const user = await this.prismaService.user.update({
      where: { id },
      data: updateUserDto,
    });
    return this.toUserVm(user);
  }

  async remove(id: number): Promise<UserVm> {
    const user = await this.prismaService.user.delete({
      where: { id },
    });
    return this.toUserVm(user);
  }
}
