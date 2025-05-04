import { Type } from 'class-transformer';

import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class PagedResponse<T> {
  page: number;
  size: number;
  cursor: number;
  result: Array<T>;
  totalPage: number;
  totalElement: number;
}
