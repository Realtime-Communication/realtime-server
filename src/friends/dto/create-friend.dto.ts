import { IsInt, IsNotEmpty } from 'class-validator';

export enum FriendStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export class CreateFriendDto {
  @IsInt()
  @IsNotEmpty()
  receiver_id: number;
}
