export class Pageable {
  page = 1;
  cursor?: number;
  limit = 10;
  search?: string;
  sort?: string;
}
