import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
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
  wsClients = new Map<string, string>();

  @SubscribeMessage('sendMessage')
  async messageInGoing(client: any, data: any) {
    const date = new Date();
    data.msgTime = date.toLocaleString();
    await this.chatService.saveMessage(data); 
    this.server.to([client.id, this.wsClients.get(data.to_id)]).emit('messageComing', data);
    this.server.to([client.id, this.wsClients.get(data.to_id)]).emit('loadLastMessage', {});
  }

  @SubscribeMessage('callUser')
  async callUser( client: Socket, data: any) {
    console.log(`Incoming call from ${data.from} to ${data.userToCall}`);
    const userToCall = this.wsClients.get(data.userToCall);
    if(userToCall) {
      console.log('Has finded user to call !');
      this.server.to(userToCall).emit("open_call", {
        receiver: data.userToCall,
        callerId: data.from,
        callerName: data.name
      });
      this.server.to(userToCall).emit("callUser", {
        signal: data.signalData,
        from: data.from,
        name: data.name,
      });
    } else this.server.to(client.id).emit('user_not_online', {})
  };

  @SubscribeMessage('typing')
  async userIsTyping(client: Socket, data: any) {
    this.server.to(this.wsClients.get(data.otherId)).timeout(3000).emit("typing", {otherId: client.handshake.query.myParam});
  }

  @SubscribeMessage('answerCall')
  async answerCall(client: Socket, data: any) {
    this.server.to(this.wsClients.get(data.to)).emit("callAccepted", data.signal);
  }

  @SubscribeMessage('refuse_call')
  async refuseCall(client: Socket, data: any) {
    this.server.to([this.wsClients.get(data.otherId), client.id]).emit("refuse_call", {otherId: data.otherId});
  }

  @SubscribeMessage('give_up_call')
  async giveUpCall(client: Socket, data: any) {
    this.server.to([this.wsClients.get(data.otherId), client.id]).emit("give_up_call", {});
  }

  @SubscribeMessage('close_call')
  async closeCall(client: Socket, data: any) {
    this.server.to([this.wsClients.get(data.otherId), client.id]).emit("close_call", {});
  }

  @SubscribeMessage('complete_close_call')
  async completeCloseCall(client: Socket, data: any) {
    this.server.to(client.id).emit("complete_close_call", {});
  }

  afterInit(server: Server) {
    console.log("Initial Server Success");
  }

  async handleDisconnect(client: Socket) {
    this.wsClients.delete(client.handshake.query.myParam.toString());
    this.server.emit('listOnline', {
      listOnline: Array.from(this.wsClients.keys())
    })
    console.log("has a user disconnect, => REST user = ", this.wsClients.size);
  }

  handleConnection(client: any, ...args: any[]) {
    this.wsClients.set(client.handshake.query.myParam, client.id);
    this.server.emit('listOnline', {
      listOnline: Array.from(this.wsClients.keys())
    })
    console.log("has a connect user => TOTAL user = ", this.wsClients.size);
  }
}