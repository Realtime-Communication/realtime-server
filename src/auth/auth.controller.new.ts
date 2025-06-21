import { 
  Body, 
  Controller, 
  Post, 
  HttpCode, 
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Inject,
  forwardRef,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
  UnauthorizedException
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiBody, 
  ApiCreatedResponse, 
  ApiBadRequestResponse, 
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiProperty
} from '@nestjs/swagger';
import { Public } from 'src/decorators/public.decorator';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginRequest } from './dto/login.dto';
import { ResponseMessage } from 'src/decorators/response-message.decorator';
import { UserResponseDto } from 'src/users/dto/user-response.dto';
import { LoginResponse } from './types/auth.types';
import { mapUserToDto } from './utils/user.mapper';

// Response DTO for login
class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;
}

/**
 * Authentication Controller
 * Handles user authentication and registration
 */
@ApiTags('Authentication')
@Controller('auth')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /**
   * User Registration
   * Creates a new user account
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Creates a new user account and returns user details'
  })
  @ApiBody({ 
    description: 'User registration data',
    type: CreateUserDto 
  })
  @ApiCreatedResponse({ 
    description: 'User successfully registered',
    type: UserResponseDto
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: 'Bad Request',
        error: 'Invalid input data'
      }
    }
  })
  @ApiConflictResponse({
    description: 'User with this email or phone already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'User with this email already exists',
        error: 'Conflict'
      }
    }
  })
  @ResponseMessage('User registered successfully')
  async register(
    @Body() createUserDto: CreateUserDto
  ): Promise<UserResponseDto> {
    try {
      const user = await this.authService.create(createUserDto);
      return mapUserToDto(user);
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Registration failed');
    }
  }

  /**
   * User Login
   * Authenticates a user and returns an access token
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User Login',
    description: 'Authenticate user and return JWT token'
  })
  @ApiBody({ 
    description: 'User credentials',
    type: LoginRequest 
  })
  @ApiResponse({ 
    status: 200,
    description: 'User successfully logged in',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid request body',
    schema: {
      example: {
        statusCode: 400,
        message: 'Bad Request',
        error: 'Invalid input data'
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized'
      }
    }
  })
  @ResponseMessage('Login successful')
  async login(
    @Body() loginRequest: LoginRequest
  ): Promise<LoginResponse> {
    try {
      const loginResponse = await this.authService.login(loginRequest);
      return loginResponse;
    } catch (error) {
      this.logger.error(`Login failed for user ${loginRequest.email}`, error.stack);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Invalid credentials');
    }
  }

  /**
   * User Logout
   * Handles user logout (client should discard the token)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'User Logout',
    description: 'Logs out the current user',
  })
  @ApiOkResponse({ 
    description: 'Successfully logged out',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout successful' }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized'
      }
    }
  })
  @ResponseMessage('Logout successful')
  async logout(): Promise<{ message: string }> {
    try {
      return await this.authService.logout();
    } catch (error) {
      this.logger.error('Logout failed', error.stack);
      throw new InternalServerErrorException('Failed to process logout');
    }
  }

  // Add refresh token endpoint if needed
  // @Public()
  // @Post('refresh-token')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Refresh Access Token' })
  // @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  // @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  // async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
  //   return this.authService.refreshToken(refreshTokenDto.refreshToken);
  // }
}
