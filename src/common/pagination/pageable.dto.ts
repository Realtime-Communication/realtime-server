import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsNumberString, IsOptional, IsString, ValidateIf } from 'class-validator';

export type SortOrder = 'asc' | 'desc';

export class Pageable {
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
  @IsString({ message: 'Order must be a string' })
  @ValidateIf(o => o.order)
  @IsEnum(['asc', 'desc'], { message: 'Order must be either "asc" or "desc"' })
  order?: SortOrder;

  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  sortBy?: string;

  @IsOptional()
  @IsString({ each: true, message: 'Search fields must be an array of strings' })
  searchFields?: string[];

  constructor(partial?: Partial<Pageable>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  get skip(): number {
    return (this.page - 1) * this.size;
  }

  get take(): number {
    return this.size;
  }

  get orderBy(): Record<string, SortOrder> | undefined {
    if (!this.sortBy || !this.order) return undefined;
    return { [this.sortBy]: this.order };
  }

  get searchFilter(): Record<string, any> | undefined {
    if (!this.search || !this.searchFields?.length) return undefined;
    
    return {
      OR: this.searchFields.map(field => ({
        [field]: { contains: this.search, mode: 'insensitive' }
      }))
    };
  }
}
