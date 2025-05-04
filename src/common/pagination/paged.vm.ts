export class PagedResponse<T> {
  page: number;
  size: number;
  cursor: number;
  result: Array<T>;
  totalPage: number;
  totalElement: number;
}
