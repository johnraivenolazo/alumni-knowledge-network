import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/ws-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { requestId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.requestId);
    return { event: 'joinedRoom', data: data.requestId };
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody()
    data: {
      requestId: string;
      senderId: string;
      content: string;
      receiverId: string;
    },
  ) {
    try {
      const message = await this.prisma.message.create({
        data: {
          content: data.content,
          senderId: data.senderId,
          receiverId: data.receiverId,
          requestId: data.requestId,
        },
        include: {
          sender: {
            select: { name: true, profilePic: true },
          },
        },
      });

      this.server.to(data.requestId).emit('newMessage', message);
      return message;
    } catch (error) {
      throw error;
    }
  }
}
