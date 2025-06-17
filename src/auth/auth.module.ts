import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './passport/local.strategy';
import { JwtStrategy } from './passport/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import ms from 'ms';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_TOKEN') || "sdfafahjwehbbjhbadshcajsskdfgajhsd",
        signOptions: { expiresIn: ms(configService.get<string>('JWT_ACCESS_EXPIRED') || 9999999) },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtModule]
}) export class AuthModule {}
