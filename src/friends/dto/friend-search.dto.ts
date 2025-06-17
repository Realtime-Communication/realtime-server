import { IsOptional, IsString, IsNumber, IsEnum, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
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
  @IsArray()
  @IsString({ each: true, message: 'Search fields must be an array of strings' })
  @Transform(({ value }) => {
    // Handle different input formats
    if (typeof value === 'string') {
      // If it's a comma-separated string, split it
      return value.split(',').map(field => field.trim()).filter(Boolean);
    }
    if (Array.isArray(value)) {
      // If it's already an array, return it
      return value.filter(field => typeof field === 'string' && field.trim().length > 0);
    }
    // If it's undefined or null, return empty array
    return [];
  })
  searchFields?: string[] = [];
}
