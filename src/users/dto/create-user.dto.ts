import { ApiProperty } from '@nestjs/swagger';
import { AccountRole } from '@prisma/client';
import {
  IsBoolean,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

import { IsBooleanString } from 'class-validator';

import { IsEmail } from 'class-validator';

import { IsObject } from 'class-validator';

import { IsOptional } from 'class-validator';

import { Matches } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: "User's phone number",
    example: '+1234567890',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({
    description: "User's email address",
    example: 'user@example.com',
    required: true,
  })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      "User's password (min 8 characters, at least 1 letter and 1 number)",
    minLength: 8,
    example: 'Password123',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({
    description: "User's first name",
    example: 'John',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiPropertyOptional({
    description: "User's middle name",
    example: 'William',
    required: false,
  })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({
    description: "User's last name",
    example: 'Doe',
    required: true,
  })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional({
    description: 'Whether the user account is active',
    default: 'true',
    required: false,
  })
  @IsOptional()
  isActive: string = 'true';

  @ApiPropertyOptional({
    description: 'Whether the user has been reported',
    default: false,
    required: false,
  })
  @IsOptional()
  isReported: boolean = false;

  @ApiPropertyOptional({
    description: 'Whether the user is blocked',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isBlocked: boolean = false;

  @ApiPropertyOptional({
    description: 'User preferences in JSON format',
    type: 'object',
    required: false,
    example: { theme: 'dark', notifications: true },
  })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;

  @IsString()
  role: AccountRole;
}
