import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserVm } from './users.vm';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SecutiryUtils } from 'src/utils/security.util';

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
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.toUserVm(user);
  }

  async findByEmail(email: string): Promise<UserVm> {
    const user = await this.prismaService.user.findUnique({
      where: { email: email },
    });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return this.toUserVm(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserVm> {
    // Check if user exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if email is being updated and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prismaService.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        throw new BadRequestException('Email is already taken');
      }
    }

    // Check if phone is being updated and if it's already taken
    if (updateUserDto.phone && updateUserDto.phone !== existingUser.phone) {
      const phoneExists = await this.prismaService.user.findUnique({
        where: { phone: updateUserDto.phone },
      });
      if (phoneExists) {
        throw new BadRequestException('Phone number is already taken');
      }
    }

    // Transform the DTO to match the database schema
    const updateData = {
      ...updateUserDto,
      first_name: updateUserDto.firstName,
      middle_name: updateUserDto.middleName,
      last_name: updateUserDto.lastName,
      is_active: updateUserDto.isActive,
      is_reported: updateUserDto.isReported,
      is_blocked: updateUserDto.isBlocked,
    };

    // Remove the camelCase properties
    delete updateData.firstName;
    delete updateData.middleName;
    delete updateData.lastName;
    delete updateData.isActive;
    delete updateData.isReported;
    delete updateData.isBlocked;

    const user = await this.prismaService.user.update({
      where: { id },
      data: updateData,
    });
    return this.toUserVm(user);
  }

  async changePassword(id: number, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isPasswordValid = SecutiryUtils.decodePassword(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Verify new passwords match
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Hash new password using SecurityUtils
    const hashedPassword = await SecutiryUtils.hashingPassword(changePasswordDto.newPassword);

    // Update password
    await this.prismaService.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  async remove(id: number): Promise<UserVm> {
    const user = await this.prismaService.user.delete({
      where: { id },
    });
    return this.toUserVm(user);
  }
}
