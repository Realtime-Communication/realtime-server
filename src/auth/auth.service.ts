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
import { User } from '@prisma/client';
import { LoginRequest } from './dto/login.dto';

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

  async create(createUserDto: CreateUserDto): Promise<User> {
    
    if (await this.emailExist(createUserDto.email)) {
      throw new BadRequestException('User email already exists!');
    }

    const hashedPassword = await SecutiryUtils.hashingPassword(
      createUserDto.password,
    );

    return this.prismaService.user.create({
      data: {
        email: createUserDto.email.toLowerCase(),
        password: hashedPassword,
        first_name: createUserDto.first_name,
        last_name: createUserDto.last_name,
        phone: createUserDto.phone,
        middle_name: createUserDto.middle_name,
        is_active: true,
      },
    });
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

    // Create device entry if deviceId is provided
    // let device;
    // if (authDto.deviceId) {
    //   device = await this.prismaService.device.upsert({
    //     where: {
    //       device_id: authDto.deviceId,
    //     },
    //     update: {
    //       device_token: authDto.deviceToken,
    //     },
    //     create: {
    //       user_id: user.id,
    //       device_id: authDto.deviceId,
    //       device_token: authDto.deviceToken,
    //       type: authDto.deviceType || 'APPLE',
    //     },
    //   });
    // }

    // Generate JWT token
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      id: user.id,
      type: ""
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
}
