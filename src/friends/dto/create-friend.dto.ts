import { IsInt, IsNotEmpty, IsEnum } from 'class-validator';

export enum FriendStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export class CreateFriendDto {
  @IsInt()
  @IsNotEmpty()
  requester_id: number;

  @IsInt()
  @IsNotEmpty()
  receiver_id: number;

  @IsEnum(FriendStatus)
  status?: FriendStatus = FriendStatus.PENDING;
}
