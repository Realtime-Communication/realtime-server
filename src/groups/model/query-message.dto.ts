import { Pageable } from 'src/common/pagination/pageable.dto';

export class QueryMessageDto extends Pageable {
  conversationId: number;
}
