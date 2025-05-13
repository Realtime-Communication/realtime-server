import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatService } from './message.service';
import { Inject, UseGuards } from '@nestjs/common';
import { CacheManager } from './cache.service';
import {
  MessageDto,
  TargetType,
  CallDto,
  CallResponseDto,
} from './dto/create-message.dto';
import { UserService } from 'src/users/users.service';
import { FriendsService } from 'src/friends/friends.service';
import { TAccountRequest } from 'src/decorators/account-request.decorator';
import { WsJwtGuard } from 'src/chat/ws.guard';
import { JwtService } from '@nestjs/jwt';
import { ConversationType } from 'src/groups/model/conversation.vm';

export interface AuthenticatedSocket extends Socket {
  account: TAccountRequest;
}

@UseGuards(WsJwtGuard)
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;
  private interval: NodeJS.Timeout;
  private wsClients = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly userService: UserService,
    private readonly cacheManager: CacheManager,
    private readonly friendSerivce: FriendsService,
  ) {}

  // @SubscribeMessage('reload')
  // async reloadDate(client: AuthenticatedSocket, messageDto: MessageDto) {
  //   this.server.emit("reloadData", {})
  // }

  getTargetSocket = (client: AuthenticatedSocket, messageDto: MessageDto) => {
    if (messageDto.conversationType == ConversationType.FRIEND) {
      return [
        `friend:${Math.min(
          client.account.id,
          messageDto.conversationId,
        )}:${Math.max(client.account.id, messageDto.conversationId)}`,
        client.id,
      ];
    } else if (messageDto.conversationType == ConversationType.GROUP) {
      return [`group:${messageDto.conversationId}`];
    }
    return `group:${messageDto.conversationId}`;
  };

  @SubscribeMessage('sendMessage')
  async messageInGoing(client: AuthenticatedSocket, messageDto: MessageDto) {
    messageDto.timestamp = new Date();
    messageDto.guid = crypto.randomUUID();
    this.chatService.saveMessage(client.account, messageDto);
    const tartGetSocket = this.getTargetSocket(client, messageDto);
    messageDto.user = client.account;
    this.server.to(tartGetSocket).emit('messageComing', messageDto);
    this.server.to(tartGetSocket).emit('loadLastMessage', {});
  }

  @SubscribeMessage('typing')
  async userIsTyping(client: AuthenticatedSocket, messageDto: MessageDto) {
    this.server
      .to(this.getTargetSocket(client, messageDto))
      .timeout(3000)
      .emit('typing', messageDto);
  }

  @SubscribeMessage('deleteMessage')
  async deleteMessage(client: AuthenticatedSocket, messageDto: MessageDto) {
    this.server
      .to(this.getTargetSocket(client, messageDto))
      .emit('delete_message', {});
  }

  //----------------------------------------------------------------------------------------------------------

  @SubscribeMessage('callUser')
  async callUser(client: AuthenticatedSocket, callDto: CallDto) {
    try {
      // const call = await this.chatService.handleCall(client.account, callDto);

      // const userToCall = await this.cacheManager.getUserSocket(
      //   callDto.userToCall,
      // );

      this.server.to(this.getTargetSocket(client, callDto)).emit('open_call', {
        receiverId: callDto.conversationId,
        callerInfomation: callDto.user,
      });

      this.server.to(this.getTargetSocket(client, callDto)).emit('callUser', {
        receiverId: callDto.conversationId,
        signal: callDto.signalData,
        callerInfomation: callDto.user,
      });

      //  TODO:
      // this.server.to(client.id).emit('user_not_online', {});

      // if (userToCall) {
      //   this.server.to(userToCall).emit('open_call', {
      //     receiver: callDto.,
      //     callerId: callDto.from,
      //     callerName: callDto.name,
      //   });

      //   this.server.to(userToCall).emit('callUser', {
      //     signal: callDto.signalData,
      //     from: callDto.from,
      //     name: callDto.name,
      //   });
      // } else {
      // }
    } catch (error) {
      this.server.to(client.id).emit('call_error', { message: error.message });
    }
  }

  @SubscribeMessage('answerCall')
  async answerCall(client: AuthenticatedSocket, callDto: CallDto) {
    try {
      // TODO:
      // await this.chatService.handleCallResponse(client.account, responseDto);

      this.server
        .to(this.getTargetSocket(client, callDto))
        .emit('callAccepted', callDto);
    } catch (error) {
      this.server.to(client.id).emit('call_error', { message: error.message });
    }
  }

  @SubscribeMessage('refuseCall')
  async refuseCall(client: AuthenticatedSocket, callDto: CallDto) {
    try {
      // TODO:
      // await this.chatService.handleCallEnd(client.account, actionDto);
      // const userToCall = await this.cacheManager.getUserSocket(
      //   actionDto.otherId,
      // );

      this.server
        .to(this.getTargetSocket(client, callDto))
        .emit('refuseCall', callDto);
    } catch (error) {
      this.server
        .to(client.account.socketId)
        .emit('call_error', { message: error.message });
    }
  }

  @SubscribeMessage('give_up_call')
  async giveUpCall(client: AuthenticatedSocket, callDto: CallDto) {
    try {
      // await this.chatService.handleCallEnd(client.account, callDto);
      // const userToCall = await this.cacheManager.getUserSocket(
      //   actionDto.otherId,
      // );
      this.server
        .to(this.getTargetSocket(client, callDto))
        .emit('give_up_call', {});

      // if (userToCall) {
      // }
    } catch (error) {
      this.server
        .to(client.account.socketId)
        .emit('call_error', { message: error.message });
    }
  }

  @SubscribeMessage('close_call')
  async closeCall(client: AuthenticatedSocket, callDto: CallDto) {
    try {
      // await this.chatService.handleCallEnd(client.account, actionDto);
      // const userToCall = await this.cacheManager.getUserSocket(
      //   actionDto.otherId,
      // );

      this.server
        .to(this.getTargetSocket(client, callDto))
        .emit('close_call', {});
    } catch (error) {
      this.server
        .to(client.account.socketId)
        .emit('call_error', { message: error.message });
    }
  }

  @SubscribeMessage('complete_close_call')
  async completeCloseCall(client: AuthenticatedSocket) {
    this.server.to(client.account.socketId).emit('complete_close_call', {});
  }

  async afterInit(server: Server) {
    try {
      this.server.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
          return next(new Error('Authentication token is missing'));
        }

        try {
          const payload = this.jwtService.verify(token); // you may need to inject jwtService here
          payload.socketId = socket.id;
          // payload.firstName
          socket.account = payload; // Assign payload to socket
          next();
        } catch (err) {
          return next(new Error('Invalid token'));
        }
      });

      await this.cacheManager.clearCache();
      await this.initializeServerState();
      console.log('WebSocket Server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebSocket Server:', error);
      throw error;
    }
  }

  private async initializeServerState() {
    // Set up event listeners
    this.server.on('error', (error) => {
      console.error('WebSocket Server Error:', error);
    });

    // Set up server configs
    this.server.engine.opts.pingTimeout = 10000;
    this.server.engine.opts.pingInterval = 5000;

    this.interval = setInterval(() => {
      this.server.emit('timerEvent', { message: 'Ping every 5s' });
    }, 10000);
  }

  onModuleDestroy() {
    clearInterval(this.interval);
  }

  async handleDisconnect(client: any) {
    // this.wsClients.delete(client.handshake.query.myParam.toString());
    this.server.emit('listOnline', {
      listOnline: Array.from(this.wsClients.keys()),
    });
    await this.cacheManager.removeUserData(client.userId);
    console.log(
      client.id,
      'just disconnected, client in sever =',
      await this.cacheManager.getCacheSize(),
    );
  }

  async handleConnection(client: AuthenticatedSocket) {
    const userId = client.account.id;
    const sockethandleConnectionId = client.id;

    await this.cacheManager.addUserSocket(userId, sockethandleConnectionId);

    const friendIds: number[] = await this.friendSerivce.getFriendIds(userId);
    const groupIds: number[] = await this.friendSerivce.getGroupIds(userId);

    const onlineFriendIds: number[] = [];

    for (const friendId of friendIds) {
      const isOnline = await this.cacheManager.isUserOnline(friendId);
      if (isOnline) {
        onlineFriendIds.push(friendId);

        // Store bidirectional graph edge
        await this.cacheManager.addFriendEdge(userId, friendId);
        await this.cacheManager.addFriendEdge(friendId, userId);

        // Join friend room (for 1-1 chat)
        client.join(
          `friend:${Math.min(userId, friendId)}:${Math.max(userId, friendId)}`,
        );
      }
    }

    // Join all groups
    for (const groupId of groupIds) {
      client.join(`group:${groupId}`);
    }

    // Notify client of online friends
    client.emit('onlineFriends', { friends: onlineFriendIds });

    // Optional: send updated list of online users
    const allOnlineUsers = await this.cacheManager.getOnlineUsers();
    this.server.emit('listOnline', { listOnline: allOnlineUsers });

    console.log(
      `User ${userId} connected. Online friends: ${onlineFriendIds.join(', ')}`,
    );
  }

  @SubscribeMessage('join_group')
  async joinGroups(client: Socket, data: any) {
    client.join(data);
  }
}
