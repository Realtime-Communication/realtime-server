import { Role } from 'src/roles/role.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsLowercase, IsNumber } from 'class-validator';
import { Builder, createBuilderClass } from 'builder-pattern-2';

export interface CreateUserDtoCtor {
  email: string;
  password: string;
  passwordKey: string;
  username: string;
  name: string;
  about?: string;
  birthday?: Date;
  height?: number;
  weight?: number;
  phone?: number;
  deleted?: boolean;
  roles?: string[];
  friends?: string[];
  groups?: string[];
  image?: string;
  active?: boolean;
}

export class CreateUserDto {
  @IsLowercase()
  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly password: string;

  @ApiProperty()
  readonly passwordKey: string;

  @IsLowercase()
  @ApiProperty()
  readonly username: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly about: string;

  @ApiProperty()
  readonly birthday: Date;

  @ApiProperty()
  readonly height: number;

  @ApiProperty()
  readonly weight: number;

  @IsNumber()
  @ApiProperty()
  readonly phone?: number;

  @ApiProperty()
  readonly deleted: boolean;

  @ApiProperty()
  readonly roles?: string[];

  @ApiProperty()
  readonly friends?: string[];

  @ApiProperty()
  readonly groups?: string[];

  @ApiProperty()
  readonly image?: string;

  @ApiProperty()
  readonly active: boolean;
}

export const CreateUserDtoBuilder: Builder<CreateUserDto, CreateUserDtoCtor> =
  createBuilderClass<CreateUserDto, CreateUserDtoCtor>(CreateUserDto);
