import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IUser } from 'src/users/user.interface';
import { UserEntity } from 'src/users/entities/user.entity';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UserService } from 'src/users/users.service';
import { SecutiryUtils } from 'src/utils/security.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async validateUser(email: string, nonHashPassword: string): Promise<any> {
    const user: UserEntity = await this.userService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (!(await SecutiryUtils.decodePassword(nonHashPassword, user.password)))
      throw new UnauthorizedException('Password is incorrect');
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
