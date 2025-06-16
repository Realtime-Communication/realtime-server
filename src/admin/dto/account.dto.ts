import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsPhoneNumber,
  IsNumber,
} from 'class-validator';
import { AccountRole } from '@prisma/client';
import { Pageable } from '../../common/pagination/pageable.dto';
import { Transform, Type } from 'class-transformer';

export class UpdateAccountDto {

  @IsNumber()
  id?: number;
  
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(AccountRole)
  role?: AccountRole;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  preferences?: string;

  @IsOptional()
  levelLeft?: number;

  @IsOptional()
  levelRight?: number;
}

export class AccountFilterDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Size must be a number' })
  size: number = 10;

  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id?: number;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(AccountRole)
  role?: AccountRole;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  preferences?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  levelLeft?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  levelRight?: number;

  @IsOptional()
  @IsString()
  order?: string;

  @IsOptional()
  @IsString({ each: true })
  searchFields?: string[];
}
