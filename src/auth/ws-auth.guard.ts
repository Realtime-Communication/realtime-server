import { Observable } from 'rxjs';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { jwtDecode } from 'jwt-decode';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/users/users.service';

interface ObjectToken {
  username: string;
  sub: string;
}

@Injectable()
export class WsGuard implements CanActivate {
  
  constructor(
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: any): boolean | any | Promise<boolean | any> | Observable<boolean | any> {
    // const bearerToken = context.args[0].handshake.headers.authorization.split(' ')[1];
    // const decoded = jwtDecode(bearerToken,
    //   this.configService.get<Object>('JWT_ACCESS_TOKEN')) as ObjectToken;

    // return new Promise(async (resolve, reject) => {
    //   const user = this.userRepository.findUserForValidate({
    //     _id: decoded.sub,
    //     deleted: false,
    //   });
    //   if (user) {
    //     resolve(user);
    //   } else {
    //     reject(false);
    //   }
    // });
  }

}
