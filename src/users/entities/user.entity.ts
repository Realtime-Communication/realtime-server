import { User } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Exclude } from 'class-transformer';

export class UserEntity implements User {

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  email: string;

  @Exclude()
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

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;

}
