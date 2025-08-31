import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  ParseIntPipe,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountRequest, TAccountRequest } from '../decorators/account-request.decorator';
import { ChatService } from './chat.service';
import { CreateMessageDto, UpdateMessageDto } from './dto';
import { PerformanceService, MessageQueueService, CacheManagerService } from './services';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly performanceService: PerformanceService,
    private readonly messageQueueService: MessageQueueService,
    private readonly cacheManagerService: CacheManagerService
  ) {}

  @Post('messages')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createMessage(
    @AccountRequest() user: TAccountRequest,
    @Body() messageDto: CreateMessageDto
  ) {
    return this.chatService.saveMessage(user, messageDto);
  }

  @Get('conversations/:conversationId/messages')
  @UseGuards(JwtAuthGuard)
  async getMessagesByConversation(
    @AccountRequest() user: TAccountRequest,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20
  ) {
    return this.chatService.getMessagesByConversation(
      user.id,
      conversationId,
      page,
      limit
    );
  }

  @Get('messages/:id')
  @UseGuards(JwtAuthGuard)
  async getMessage(
    @AccountRequest() user: TAccountRequest,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.chatService.getMessage(user.id, id);
  }

  @Put('messages/:id')
  @UseGuards(JwtAuthGuard)
  async updateMessage(
    @AccountRequest() user: TAccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMessageDto: UpdateMessageDto
  ) {
    return this.chatService.updateMessage(user.id, id, updateMessageDto);
  }

  @Delete('messages/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @AccountRequest() user: TAccountRequest,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.chatService.deleteMessage(user, id);
  }

  @Get('users/:userId/rooms')
  @UseGuards(JwtAuthGuard)
  async getUserRooms(
    @AccountRequest() user: TAccountRequest,
    @Param('userId', ParseIntPipe) userId: number
  ) {
    // Only allow users to get their own rooms
    if (user.id !== userId) {
      throw new Error('Forbidden');
    }
    return this.chatService.getUserRooms(userId);
  }

  @Get('online-users')
  @UseGuards(JwtAuthGuard)
  async getOnlineUsers() {
    return this.chatService.getOnlineUsers();
  }

  @Get('health')
  async healthCheck() {
    return this.chatService.healthCheck();
  }

  // =============== Performance Monitoring Endpoints ===============

  // @Get('performance/metrics')
  // @UseGuards(JwtAuthGuard)
  // async getPerformanceMetrics() {
  //   return {
  //     current: this.performanceService.getCurrentMetrics(),
  //     recent: this.performanceService.getRecentMetrics(20),
  //     recommendations: this.performanceService.getPerformanceRecommendations(),
  //   };
  // }

  // @Get('performance/alerts')
  // @UseGuards(JwtAuthGuard)
  // async getPerformanceAlerts() {
  //   return {
  //     recent: this.performanceService.getRecentAlerts(20),
  //   };
  // }

  @Get('performance/health')
  async getSystemHealth() {
    return this.performanceService.getHealthStatus();
  }

  @Get('queue/stats')
  @UseGuards(JwtAuthGuard)
  async getQueueStats() {
    return this.messageQueueService.healthCheck();
  }

  @Get('cache/stats')
  @UseGuards(JwtAuthGuard)
  async getCacheStats() {
    return this.cacheManagerService.healthCheck();
  }

  // @Get('performance/dashboard')
  // @UseGuards(JwtAuthGuard)
  // async getPerformanceDashboard() {
  //   const [performance, queueStats, cacheStats] = await Promise.all([
  //     this.performanceService.getHealthStatus(),
  //     this.messageQueueService.healthCheck(),
  //     this.cacheManagerService.healthCheck(),
  //   ]);

  //   return {
  //     timestamp: new Date(),
  //     performance,
  //     queueStats,
  //     cacheStats,
  //     recommendations: this.performanceService.getPerformanceRecommendations(),
  //     recentAlerts: this.performanceService.getRecentAlerts(10),
  //   };
  // }
} 
