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
import { Inject, UseGuards } from '@nestjs/common';
import { WsGuard } from 'src/auth/ws-auth.guard';
import { CacheManager } from './cacheManager.service';

@UseGuards(WsGuard)
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ["GET", "POST"],
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private chatService: ChatService,
    private cacheManager: CacheManager
  ) {}

  @WebSocketServer()
  private server: Server;
  private wsClients = new Map<string, string>();

  @UseGuards(WsGuard)
  @SubscribeMessage('sendMessage')
  async messageInGoing(client: any, data: any) {
    const date = new Date();
    data.msgTime = date.toLocaleString();
    const _id = await this.chatService.saveMessage(data); // to delete message
    data._id = _id;
    const otherSocketId = await this.cacheManager.getSocketId(data.to_id) || this.wsClients.get(data.to_id);
    if(otherSocketId) data.group = '';
    this.server.to([client.id, data.to_id, otherSocketId]).emit('messageComing', data);
    this.server.to([client.id, data.to_id, otherSocketId]).emit('loadLastMessage', {});
  }

  @SubscribeMessage('typing')
  async userIsTyping(client: Socket, data: any) {
    const otherSocketId = await this.cacheManager.getSocketId(data.otherId) || this.wsClients.get(data.userToCall);
    this.server.to(otherSocketId).timeout(3000).emit("typing", { otherId: client.handshake.query.myParam });
  }

  @SubscribeMessage('delete_message')
  async deleteMessage(_: Socket, data: any) {
    const otherSocketId = await this.cacheManager.getSocketId(data.otherId) || this.wsClients.get(data.userToCall);
    this.server.to(otherSocketId).emit("delete_message", {});
  }

  @SubscribeMessage('callUser')
  async callUser( client: Socket, data: any) {
    console.log(`Incoming call from ${data.from} to ${data.userToCall}`);
    const userToCall = await this.cacheManager.getSocketId(data.userToCall) || this.wsClients.get(data.userToCall);
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
    } else this.server.to(client.id).emit('user_not_online', {});
  };

  @SubscribeMessage('answerCall')
  async answerCall(_: Socket, data: any) {
    this.server.to(await this.cacheManager.getSocketId(data.to) || this.wsClients.get(data.to)).emit("callAccepted", data.signal);
  }

  @SubscribeMessage('refuse_call')
  async refuseCall(client: Socket, data: any) {
    this.server.to([await this.cacheManager.getSocketId(data.otherId) || this.wsClients.get(data.otherId), client.id]).emit("refuse_call", {otherId: data.otherId});
  }

  @SubscribeMessage('give_up_call')
  async giveUpCall(client: Socket, data: any) {
    this.server.to([await this.cacheManager.getSocketId(data.otherId) || this.wsClients.get(data.otherId), client.id]).emit("give_up_call", {});
  }

  @SubscribeMessage('close_call')
  async closeCall(client: Socket, data: any) {
    this.server.to([await this.cacheManager.getSocketId(data.otherId) || this.wsClients.get(data.otherId), client.id]).emit("close_call", {});
  }

  @SubscribeMessage('complete_close_call')
  async completeCloseCall(client: Socket, _: any) {
    this.server.to(client.id).emit("complete_close_call", {});
  }

  async afterInit(server: Server) {
    await this.cacheManager.clearStore();
    console.log("Initial Server Success");
  }

  async handleDisconnect(client: Socket) {
    this.wsClients.delete(client.handshake.query.myParam.toString());
    this.server.emit('listOnline', {
      listOnline: Array.from(this.wsClients.keys())
    })
    await this.cacheManager.removeUserId(client.handshake.query.myParam as string);
    console.log(client.id, "just disconnected, client in sever =", await this.cacheManager.size());
  }

  async handleConnection(client: any, ...args: any[]) {
    this.wsClients.set(client.handshake.query.myParam, client.id);
    await this.cacheManager.addUserId(client.handshake.query.myParam as string, client.id);
    console.log(await this.cacheManager.getSocketId(client.handshake.query.myParam as string), "just connect, client in sever =", await this.cacheManager.size());
    this.server.emit('listOnline', {
      listOnline: Array.from(this.wsClients.keys())
    })
  }

  @SubscribeMessage('join_groups')
  async joinGroups(client: Socket, data: any) {
    client.join(data);
  }
}