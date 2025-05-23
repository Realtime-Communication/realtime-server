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
  first_name: string;

  @ApiProperty()
  @IsString()
  middle_name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  last_name: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  is_reported: boolean;

  @ApiProperty()
  is_blocked: boolean;

  @ApiProperty()
  preferences: string;

  role: AccountRole
}
