import { Type } from 'class-transformer';
import { isNumber, IsNumberString, IsOptional, IsString } from 'class-validator';

export class Pageable {
  @Type(() => Number)
  page: number;

  @IsOptional()
  @Type(() => Number)
  size: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc' | string; // or more specific types

  constructor(partial?: Partial<Pageable>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
