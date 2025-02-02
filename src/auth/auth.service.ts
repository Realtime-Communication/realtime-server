import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from 'src/users/entities/user.entity';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UserService } from 'src/users/users.service';
import { SecutiryUtils } from 'src/utils/security.util';
import { AuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async validateUser(email: string, nonHashPassword: string) {
    const user: UserEntity = await this.userService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (!(await SecutiryUtils.decodePassword(nonHashPassword, user.password)))
      throw new UnauthorizedException('Password is incorrect');
    const { password, ...result } = user;
    return result;
  }

  async login(user: AuthDto) {
    return {
      username: user.username,
      access_token: this.jwtService.sign({ username: user.username, sub: user.id }),
    };
  }
}
