import { Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { HelpersService } from './../helpers/helpers.service';
import { JwtService } from '@nestjs/jwt';
import { IUser } from 'src/users/user.interface';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private readonly helpersService: HelpersService,
        private jwtService: JwtService
    ) {}

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user) {
            if(await this.helpersService.decodePassword(password, user.password)) {
                const { password, ...result } = user;
                return result;
            }
        }
        return null;
    }

    async login(user: IUser) {
        const payload = { username: user.name, sub: user._id, image: user.image };
        return {
          access_token: this.jwtService.sign(payload),
        };
    }

    async register(createUserDto: any) {
        return this.usersService.create(createUserDto);
    }
}