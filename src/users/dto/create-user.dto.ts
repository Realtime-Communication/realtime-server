import { Role } from 'src/roles/role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly password: string;

  @ApiProperty()
  readonly phone?: number;

  @ApiProperty()
  readonly username: string;

  @ApiProperty()
  readonly address?: string;

  @ApiProperty()
  readonly role?: Role[];

  @ApiProperty()
  readonly friends?: string[];
}
