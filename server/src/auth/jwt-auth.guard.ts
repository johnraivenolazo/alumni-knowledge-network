import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isValid = await super.canActivate(context);
    if (!isValid) return false;

    const request = context.switchToHttp().getRequest();

    // Direct DB check to avoid circular dependency with UsersService
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { isBanned: true },
    });

    if (user && user.isBanned) {
      throw new ForbiddenException('Your account has been banned');
    }

    return true;
  }
}
