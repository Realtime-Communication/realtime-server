import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UserService } from 'src/users/users.service';
import { SecutiryUtils } from 'src/utils/security.util';
import { AuthDto } from './dto/auth.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { AccountRole, User } from '@prisma/client';
import { LoginRequest } from './dto/login.dto';
import { TAccountRequest } from 'src/decorators/account-request.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly prismaService: PrismaService,
  ) {}

  async emailExist(email: string, id?: number): Promise<boolean> {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
    return user !== null && id !== user.id;
  }

  async create(createUserDto: CreateUserDto) {
    if (await this.emailExist(createUserDto.email)) {
      throw new BadRequestException('User email already exists!');
    }

    const hashedPassword = await SecutiryUtils.hashingPassword(
      createUserDto.password,
    );

    const user = await this.prismaService.user.create({
      data: {
        email: createUserDto.email.toLowerCase(),
        password: hashedPassword,
        first_name: createUserDto.firstName,
        last_name: createUserDto.lastName,
        phone: createUserDto.phone,
        middle_name: createUserDto.middleName,
        is_active: true,
        role: createUserDto.role,
      },
    });
    
    return user;
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.prismaService.user.findFirst({
      where: {
        email: email.toLowerCase(),
        is_active: true,
        is_blocked: false,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await SecutiryUtils.decodePassword(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginRequest: LoginRequest) {
    const user = await this.validateUser(
      loginRequest.email,
      loginRequest.password,
    ); 

    const accessToken = this.jwtService.sign({
      firstName: user.first_name,
      lastName: user.last_name,
      sub: user.id,
      email: user.email,
      id: user.id,
      type: user.role.valueOf(),
    });

    // Create access record
    // if (device) {
    //   await this.prismaService.access.create({
    //     data: {
    //       user_id: user.id,
    //       device_id: device.id,
    //       token: access_token,
    //     },
    //   });
    // }

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isActive: user.is_active,
      },
    };
  }

  /**
   * Simple logout - In a stateless JWT system, the client should discard the token
   * This is a placeholder for any future cleanup that might be needed
   */
  async logout(): Promise<{ message: string }> {
    // In a stateless JWT system, the client should discard the token
    // If you need to invalidate tokens, you would need to implement a token blacklist
    return { message: 'Logout successful' };
  }

  /**
   * Verify access token and return the payload as TAccountRequest
   */
  async verifyAccessToken(token: string): Promise<TAccountRequest> {
    try {
      const payload = this.jwtService.verify(token);
      
      return {
        id: payload.id,
        firstName: payload.firstName,
        lastName: payload.lastName,
        type: payload.type,
        socketId: undefined, // socketId is not stored in JWT, will be set elsewhere
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
