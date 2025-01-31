import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
// import { StringToBuffer } from '@/utils/StringToBuffer';

export class PaginationQueryDto {
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  page = 1;

  // @StringToBuffer()
  @IsNotEmpty()
  @IsOptional()
  cursor?: string;

  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  limit = 10;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  search?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sort?: string;
}
