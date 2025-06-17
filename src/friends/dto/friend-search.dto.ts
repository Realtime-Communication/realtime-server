import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { FriendStatus } from '@prisma/client';

export class FriendSearchDto {
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Size must be a number' })
  size: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(FriendStatus)
  status?: FriendStatus;

  @IsOptional()
  @IsString()
  order?: string;

  @IsOptional()
  @IsString({ each: true, message: 'Search fields must be an array of strings' })
  searchFields?: string[];
}
