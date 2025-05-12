import { IsEmail, IsInt, IsNotEmpty } from 'class-validator';

export enum FriendStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export class AddFriendDto {
  email?: string;

  receiverId?: number;
}
