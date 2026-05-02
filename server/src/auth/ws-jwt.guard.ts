import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private jwksClient: JwksClient;

  constructor(private prisma: PrismaService) {
    this.jwksClient = new JwksClient({
      jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = client.handshake.auth?.token;

      if (!token) {
        throw new WsException('Unauthorized: No token provided');
      }

      const cleanToken = token.replace('Bearer ', '');

      const payload: any = await new Promise((resolve, reject) => {
        jwt.verify(
          cleanToken,
          (header, callback) => {
            this.jwksClient.getSigningKey(header.kid, (err, key) => {
              if (err) {
                return callback(err);
              }
              const signingKey = key?.getPublicKey();
              callback(null, signingKey);
            });
          },
          {
            audience: process.env.AUTH0_AUDIENCE,
            issuer: `https://${process.env.AUTH0_DOMAIN}/`,
            algorithms: ['RS256'],
          },
          (err, decoded) => {
            if (err) {
              return reject(err);
            }
            resolve(decoded);
          },
        );
      });

      // Real-time ban check for WebSockets using Prisma directly
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isBanned: true },
      });

      if (user && user.isBanned) {
        throw new WsException('Your account has been banned');
      }

      client['user'] = payload;
      return true;
    } catch (err) {
      console.error('WsJwtGuard: Auth failed', err.message);
      throw new WsException('Unauthorized');
    }
  }
}
