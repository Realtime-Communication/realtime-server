import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { Pageable } from 'src/common/pagination/pageable.dto';

export class QueryMessageDto {
  conversationId: number;

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
