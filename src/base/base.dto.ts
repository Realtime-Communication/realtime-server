import { ApiProperty } from '@nestjs/swagger';
import { Binary } from 'mongodb';

export class BaseDto {
  protected readonly id: Binary;

  @ApiProperty()
  readonly deleted: boolean;
}
