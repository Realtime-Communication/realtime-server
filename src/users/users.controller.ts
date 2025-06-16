import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Post,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './users.service';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserVm } from './users.vm';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  AccountRequest,
  TAccountRequest,
} from 'src/decorators/account-request.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiOkResponse({
    type: UserVm,
    description: 'Returns the current user information',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getCurrentUser(@AccountRequest() account: TAccountRequest) {
    return await this.userService.findOne(account.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ type: UserVm, description: 'Returns the user information' })
  @ApiResponse({ status: 403, description: 'You can only view your own information' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @AccountRequest() account: TAccountRequest,
  ) {
    // Only allow users to view their own information
    // if (id !== account.id) {
    //   throw new ForbiddenException('You can only view your own information');
    // }
    return await this.userService.findOne(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user information' })
  @ApiCreatedResponse({
    type: UserVm,
    description: 'User information updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or email/phone already taken',
  })
  @ApiResponse({
    status: 403,
    description: 'You can only update your own information',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    // @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @AccountRequest() account: TAccountRequest,
  ) {
    // Only allow users to update their own information
    // if (id !== account.id) {
    //   throw new ForbiddenException('You can only update your own information');
    // }
    return await this.userService.update(account.id, updateUserDto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid current password or new passwords do not match',
  })
  @ApiResponse({
    status: 403,
    description: 'You can only change your own password',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @AccountRequest() account: TAccountRequest,
  ) {
    // Only allow users to change their own password
    // if (account.id !== changePasswordDto.id) {
    //   throw new ForbiddenException('You can only change your own password');
    // }
    await this.userService.changePassword(account.id, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Delete('')
  @ApiOperation({ summary: 'Delete user' })
  @ApiOkResponse({ type: UserVm, description: 'User deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'You can only delete your own account',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @AccountRequest() account: TAccountRequest,
  ) {
    // Only allow users to delete their own account
    // if (id !== account.id) {
    //   throw new ForbiddenException('You can only delete your own account');
    // }
    return await this.userService.remove(account.id);
  }
}
