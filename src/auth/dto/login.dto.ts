import { IsString, IsNotEmpty } from 'class-validator';

export class LoginRequest {
  // @IsString()
  // @IsNotEmpty()
  // username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  // @IsEmail()
  // @IsNotEmpty()
  email: string;

  // @IsString()
  // @IsOptional() // If the ID is optional, otherwise remove this decorator
  // id?: string;
}
