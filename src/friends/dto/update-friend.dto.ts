import { FriendStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateFriendDto {
  @IsNotEmpty()
  status: FriendStatus;
}
