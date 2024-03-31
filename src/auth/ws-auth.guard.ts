import { Observable } from "rxjs";
import { UsersService } from "src/users/users.service";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { jwtDecode } from 'jwt-decode';
import { ConfigService } from '@nestjs/config';

interface ObjectToken {
    username: string;
    sub: string;
}
@Injectable()
export class WsGuard implements CanActivate {

    constructor(
        private userService: UsersService,
        private configService: ConfigService,
    ) {}

    canActivate(
        context: any,
    ): boolean | any | Promise<boolean | any> | Observable<boolean | any> {
        const bearerToken = context.args[0].handshake.headers.authorization.split(' ')[1];
        try {
            const decoded = jwtDecode(bearerToken, this.configService.get<any>('JWT_ACCESS_TOKEN')) as ObjectToken;
            return new Promise(async (resolve, reject) => {
                const user = await this.userService.findOne(decoded.sub);
                if (user) {
                    resolve(user);
                } else {
                    reject(false);
                }
            });
        } catch (exception) {
            console.log(exception);
            return false;
        }
    }
}