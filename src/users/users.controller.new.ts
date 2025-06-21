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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserVm } from './users.vm';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AccountRequest, TAccountRequest } from 'src/decorators/account-request.decorator';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get current user information',
    description: 'Retrieves the currently authenticated user\'s information.'
  })
  @ApiOkResponse({
    description: 'Successfully retrieved current user information',
    type: UserVm,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getCurrentUser(@AccountRequest() account: TAccountRequest) {
    return await this.userService.findOne(account.id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Retrieves user information by user ID.'
  })
  @ApiParam({ 
    name: 'id',
    type: Number,
    description: 'User ID',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Successfully retrieved user information',
    type: UserVm 
  })
  @ApiForbiddenResponse({ 
    description: 'You can only view your own information' 
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Invalid user ID' })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update user information',
    description: 'Updates the current user\'s information.'
  })
  @ApiBody({ 
    type: UpdateUserDto,
    description: 'User data to update',
  })
  @ApiOkResponse({
    description: 'User information updated successfully',
    type: UserVm,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input or email/phone already taken'
  })
  @ApiForbiddenResponse({
    description: 'You can only update your own information'
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async update(
    @Body() updateUserDto: UpdateUserDto,
    @AccountRequest() account: TAccountRequest,
  ) {
    return await this.userService.update(account.id, updateUserDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Change user password',
    description: 'Changes the current user\'s password.'
  })
  @ApiBody({ 
    type: ChangePasswordDto,
    description: 'Current and new password information',
  })
  @ApiOkResponse({ 
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid current password or new passwords do not match'
  })
  @ApiForbiddenResponse({
    description: 'You can only change your own password'
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @AccountRequest() account: TAccountRequest,
  ) {
    return await this.userService.changePassword(account.id, changePasswordDto);
  }
}
