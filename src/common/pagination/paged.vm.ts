export class PagedResponse<T> {
  page: number;
  size: number;
  // cursor: number;
  result: T[];
  totalPage: number;
  totalElement: number;
}
