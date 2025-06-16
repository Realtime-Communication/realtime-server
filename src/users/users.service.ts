import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserVm } from './users.vm';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SecutiryUtils } from 'src/utils/security.util';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  private toUserVm(user: User): UserVm {
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      password: '*********',
      firstName: user.first_name,
      type: user.role,
      middleName: user.middle_name,
      lastName: user.last_name,
      isActive: user.is_active,
      isReported: null,
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
      if (emailExists && emailExists.id !== id) {
        throw new BadRequestException('Email is already taken');
      }
    }

    // Check if phone is being updated and if it's already taken
    if (updateUserDto.phone && updateUserDto.phone !== existingUser.phone) {
      const phoneExists = await this.prismaService.user.findUnique({
        where: { phone: updateUserDto.phone },
      });
      if (phoneExists && phoneExists.id !== id) {
        throw new BadRequestException('Phone number is already taken');
      }
    }

    // Transform the DTO to match the database schema
    const updateData = {
      ...updateUserDto,
      first_name: updateUserDto.firstName,
      middle_name: updateUserDto.middleName,
      last_name: updateUserDto.lastName, 
    };

    // Remove the camelCase properties
    delete updateData.firstName;
    delete updateData.middleName;
    delete updateData.lastName; 

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
    if (changePasswordDto.newPassword !== changePasswordDto.confirmNewPassword) {
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
    return await this.prismaService.$transaction(async (prisma) => {
      // Get user data before deletion
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get all message and story IDs for this user first
      const [messages, stories] = await Promise.all([
        prisma.message.findMany({
          where: { sender_id: id },
          select: { id: true }
        }),
        prisma.story.findMany({
          where: { user_id: id },
          select: { id: true }
        })
      ]);
      
      const messageIds = messages.map(msg => msg.id);
      const storyIds = stories.map(story => story.id);

      // Delete message-related records in the correct order
      if (messageIds.length > 0) {
        // Delete attachments and deleted_messages for these messages
        await Promise.all([
          prisma.attachment.deleteMany({
            where: { message_id: { in: messageIds } }
          }),
          prisma.deletedMessage.deleteMany({
            where: { message_id: { in: messageIds } }
          })
        ]);
      }

      // Delete story-related records in the correct order
      if (storyIds.length > 0) {
        // First delete likes and comments on user's stories (from other users)
        await Promise.all([
          prisma.storyLike.deleteMany({
            where: { story_id: { in: storyIds } }
          }),
          prisma.storyComment.deleteMany({
            where: { story_id: { in: storyIds } }
          })
        ]);
      }

      // Delete user's interactions with other content
      await Promise.all([
        prisma.storyLike.deleteMany({ where: { user_id: id } }),
        prisma.storyComment.deleteMany({ where: { user_id: id } }),
        prisma.access.deleteMany({ where: { user_id: id } }),
        prisma.userVerification.deleteMany({ where: { user_id: id } }),
        prisma.blockList.deleteMany({ where: { OR: [{ user_id: id }, { participant_id: id }] } }),
        prisma.participant.deleteMany({ where: { user_id: id } }),
        prisma.deletedMessage.deleteMany({ where: { user_id: id } }),
        prisma.deletedConversation.deleteMany({ where: { user_id: id } }),
        prisma.report.deleteMany({ where: { OR: [{ user_id: id }, { participant_id: id }] } }),
        prisma.friend.deleteMany({ where: { OR: [{ requester_id: id }, { receiver_id: id }] } })
      ]);
      
      // Delete the stories and messages
      await Promise.all([
        storyIds.length > 0 && prisma.story.deleteMany({
          where: { id: { in: storyIds } }
        }),
        messageIds.length > 0 && prisma.message.deleteMany({
          where: { id: { in: messageIds } }
        })
      ].filter(Boolean));

      // Delete the user
      await prisma.user.delete({
        where: { id },
      });

      return this.toUserVm(user);
    });
  }
}
