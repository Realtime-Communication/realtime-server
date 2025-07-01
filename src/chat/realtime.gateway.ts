import {
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from './ws.guard';
import { AuthenticatedSocket } from './interfaces/authenticated-socket.interface';
import { MessageHandler } from './handlers/message.handler';
import { CallHandler } from './handlers/call.handler';
import { ConnectionHandler } from './handlers/connection.handler';
import { MessageDto, CallDto, DeleteMessageDto } from './dto/create-message.dto';
import { WebSocketSecurityService } from './websocket-security.service';

@UseGuards(WsJwtGuard)
@UsePipes(new ValidationPipe({ 
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors) => {
    return new WsException(errors);
  }
}))
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 10000,
  pingInterval: 5000,
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly messageHandler: MessageHandler,
    private readonly callHandler: CallHandler,
    private readonly connectionHandler: ConnectionHandler,
    private readonly securityService: WebSocketSecurityService,
  ) {}

  /**
   * Gateway initialization
   */
  async afterInit(server: Server): Promise<void> {
    try {
      // Set server instance for handlers
      this.messageHandler.setServer(server);
      this.callHandler.setServer(server);
      this.connectionHandler.setServer(server);

      // Configure authentication middleware
      server.use((socket: AuthenticatedSocket, next) => {
        this.authenticateSocket(socket, next);
      });

      // Configure server options
      this.configureServer(server);

      this.logger.log('WebSocket Server initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket Server:', error);
      throw error;
    }
  }

  /**
   * Handle new connections
   */
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    await this.connectionHandler.handleConnection(client);
  }

  /**
   * Handle disconnections
   */
  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    await this.connectionHandler.handleDisconnect(client);
  }

  // =============== Message Events ===============

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    client: AuthenticatedSocket,
    messageDto: MessageDto
  ): Promise<void> {
    await this.messageHandler.handleMessage(client, messageDto);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    client: AuthenticatedSocket,
    messageDto: MessageDto
  ): Promise<void> {
    await this.messageHandler.handleTyping(client, messageDto);
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    client: AuthenticatedSocket,
    deleteDto: DeleteMessageDto
  ): Promise<void> {
    await this.messageHandler.handleDeleteMessage(client, deleteDto);
  }

  @SubscribeMessage('messageRead')
  async handleMessageRead(
    client: AuthenticatedSocket,
    data: { messageId: number; conversationId: number; conversationType: string }
  ): Promise<void> {
    await this.messageHandler.handleMessageRead(client, data);
  }

  // =============== Call Events ===============

  @SubscribeMessage('callUser')
  async handleCallUser(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    await this.callHandler.handleCallUser(client, callDto);
  }

  @SubscribeMessage('answerCall')
  async handleAnswerCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    await this.callHandler.handleAnswerCall(client, callDto);
  }

  @SubscribeMessage('refuseCall')
  async handleRefuseCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    await this.callHandler.handleRefuseCall(client, callDto);
  }

  @SubscribeMessage('giveUpCall')
  async handleGiveUpCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    await this.callHandler.handleGiveUpCall(client, callDto);
  }

  @SubscribeMessage('closeCall')
  async handleCloseCall(
    client: AuthenticatedSocket,
    callDto: CallDto
  ): Promise<void> {
    await this.callHandler.handleCloseCall(client, callDto);
  }

  @SubscribeMessage('completeCloseCall')
  async handleCompleteCloseCall(client: AuthenticatedSocket): Promise<void> {
    await this.callHandler.handleCompleteCloseCall(client);
  }

  // =============== Group Events ===============

  @SubscribeMessage('join_group')
  async handleJoinGroup(
    client: AuthenticatedSocket,
    groupId: number
  ): Promise<void> {
    await this.connectionHandler.handleJoinGroup(client, groupId);
  }

  // =============== Private Methods ===============

  /**
   * Authenticate socket connection
   */
  private authenticateSocket(
    socket: AuthenticatedSocket,
    next: (err?: Error) => void
  ): void {
    try {
      const token = socket.handshake.auth?.token ||
                   socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.securityService.markSuspiciousActivity(socket.handshake.address);
        return next(new Error('Authentication token is missing'));
      }

      const payload = this.jwtService.verify(token);
      payload.socketId = socket.id;
      socket.account = payload;
      
      next();
    } catch (err) {
      this.securityService.markSuspiciousActivity(socket.handshake.address);
      return next(new Error('Invalid token'));
    }
  }

  /**
   * Configure server settings
   */
  private configureServer(server: Server): void {
    // Error handling
    server.on('error', (error) => {
      this.logger.error('WebSocket Server Error:', error);
    });

    // Connection limits
    server.setMaxListeners(100);

    // Configure engine options
    if (server.engine) {
      server.engine.opts.pingTimeout = 10000;
      server.engine.opts.pingInterval = 5000;
      server.engine.opts.upgradeTimeout = 10000;
      server.engine.opts.maxHttpBufferSize = 1e6; // 1MB
    }
  }
}
