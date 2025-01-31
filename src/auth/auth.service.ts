import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UtilService } from '../utils/common.util';
import { JwtService } from '@nestjs/jwt';
import { IUser } from 'src/users/user.interface';
import { UserRepository } from 'src/users/users.repository';
import { SUser } from 'src/users/schemas/user.schema';

@Injectable()
export class AuthService {

  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository
  ) {}

  async validateUser(email: string, nonHashPassword: string): Promise<any> {
    const user: SUser = await this.userRepository.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (!(await UtilService.decodePassword(nonHashPassword, user.password))) throw new UnauthorizedException('Password is incorrect');
    const { password, ...result } = user;
    return result;
  }

  async login(user: IUser) {
    const payload = { username: user.name, sub: user._id, image: user.image };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

}
