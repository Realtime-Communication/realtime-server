import { ApiProperty } from '@nestjs/swagger';

export class BaseDto {
  @ApiProperty()
  readonly deleted: boolean;
}
