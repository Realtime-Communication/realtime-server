import { PartialType } from '@nestjs/swagger';
import { CreateFriendDto, FriendStatus } from './create-friend.dto';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateFriendDto extends PartialType(CreateFriendDto) {
  id?: number;

  @IsEnum(FriendStatus)
  @IsOptional()
  status?: FriendStatus;
}
