import { JwtAuthGuard } from './jwt-auth.guard';
import { WsJwtGuard } from './ws-jwt.guard';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), PrismaModule],
  providers: [JwtStrategy, JwtAuthGuard, WsJwtGuard],
  exports: [PassportModule, JwtAuthGuard, WsJwtGuard],
})
export class AuthModule {}
