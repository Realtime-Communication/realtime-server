import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Chat } from './schemas/chat.shema';
import { ChatService } from './realtime.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ["GET", "POST"],
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatService: ChatService,
  ) {}

  @WebSocketServer()
  server: Server;
  wsClients = [];

  @SubscribeMessage('sendMessage')
  async messageInGoing(client: any, data: any) {
    await this.chatService.saveMessage(data);
    this.server.of('/').sockets.forEach((socket: any) => {
      console.log(socket.userId, data.to);
      if(socket.userId == data.to_id) {
        this.server.to(socket.id).emit('messageComing', data);
      }
    })
    this.server.to(client.id).emit('messageComing', data);
  }

  @SubscribeMessage('initial')
  async userInitial(client: any, payload: any) {
    client.userId = payload.id;
    client.userName = payload.userName;
  }

  @SubscribeMessage('callUser')
  async callUser( client: Socket, data: any) {
    let finded = false;
    console.log(`Incoming call from ${data.from} to ${data.userToCall}`);
    this.server.of('/').sockets.forEach((socket: any) => {
      if(socket.userId == data.userToCall) {
        console.log("Has Finded user");
        finded = true;
        this.server.to(socket.id).emit("callUser", {
          signal: data.signalData,
          from: data.from,
          name: data.name,
        });
      }
    });
    if(!finded) this.server.to(client.id).emit('user_not_online', {})
  };

  @SubscribeMessage('answerCall')
  async answerCall(client: Socket, data: any) {
    console.log("xnxx");
    this.server.of('/').sockets.forEach((socket: any) => {
      console.log(socket.userId, data.to);
      if(socket.userId == data.to) {
        console.log("had send acception from sever !")
        this.server.to(socket.id).emit("callAccepted", data.signal);
      }
    })
  }

  @SubscribeMessage('refuse_call')
  async refuseCall(client: Socket, data: any) {
    this.server.of('/').sockets.forEach((socket: any) => {
      if(socket.userId == data.otherId) {
        this.server.to(socket.id).emit("refuse_call", {});
        this.server.to(client.id).emit("refuse_call", {});
      }
    })
  }

  @SubscribeMessage('give_up_call')
  async giveUpCall(client: Socket, data: any) {
    this.server.to(client.id).emit("give_up_call", {});
    this.server.of('/').sockets.forEach((socket: any) => {
      if(socket.userId == data.otherId) {
        this.server.to(socket.id).emit("give_up_call", {});
      }
    })
  }

  @SubscribeMessage('open_call')
  async openCall(client: Socket, data: any) {
    this.server.of('/').sockets.forEach((socket: any) => {
      if(socket.userId == data.receiverId) {
        this.server.to(socket.id).emit("open_call", {
          receiver: data.receiverId,
          callerId: data.callerId
        });
      }
    })
  }

  @SubscribeMessage('close_call')
  async closeCall(client: Socket, data: any) {
    this.server.to(client.id).emit("close_call", {});
    this.server.of('/').sockets.forEach((socket: any) => {
      if(socket.userId == data.otherId) {
        this.server.to(socket.id).emit("close_call", {});
      }
    })
  }

  @SubscribeMessage('complete_close_call')
  async completeCloseCall(client: Socket, data: any) {
    this.server.to(client.id).emit("complete_close_call", {});
  }

  afterInit(server: Server) {
    console.log("Initial Server Success");
  }

  async handleDisconnect(client: Socket) {
    console.log("has a user disconnect, => REST user = ", this.server.of('/').sockets.size)
  }

  handleConnection(client: any, ...args: any[]) {
    client.emit("me", client.id);
    console.log("has a connect user => TOTAL user = ", this.server.of('/').sockets.size);
  }
}