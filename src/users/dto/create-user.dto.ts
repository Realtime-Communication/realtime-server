import { Role } from 'src/roles/role.enum';

export class CreateUserDto {
    email: string;
    password: string;
    phone?: number;
    userName: string;
    address?: string;
    role?: Role[];
    friends?: string[];
}