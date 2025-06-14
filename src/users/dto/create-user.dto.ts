import { ApiProperty } from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';
import {
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  middleName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isReported: boolean;

  @ApiProperty()
  isBlocked: boolean;

  @ApiProperty()
  preferences: string;

  role: AccountRole
}
