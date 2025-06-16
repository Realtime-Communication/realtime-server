import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { notContains } from 'class-validator';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'role', 'isBlocked', 'isReported', 'isActive'] as const),
) {
  id?: number;
}
