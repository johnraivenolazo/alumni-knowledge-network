import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@akn/database';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly SUPERADMIN_EMAILS = [
    'jcesperanza@neu.edu.ph',
    'johnraivenolazo@gmail.com',
    'borisgamaliel.duque@neu.edu.ph',
    'olazoraiven@gmail.com',
    'raivenolazo@gmail.com',
  ];

  constructor(private prisma: PrismaService) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: Record<string, any>) {
    const sub = payload.sub as string | undefined;
    let email =
      (payload.email as string) ||
      (payload['https://akn-api.com/email'] as string);
    let name =
      (payload.name as string) ||
      (payload['https://akn-api.com/name'] as string);

    // 1. Stable lookup by Auth0 sub (works even when token lacks email claims)
    if (sub) {
      const userBySub = await this.prisma.user.findUnique({
        where: { auth0Sub: sub },
      });
      if (userBySub) {
        if (userBySub.isBanned) {
          throw new ForbiddenException('Your account has been banned');
        }
        return userBySub;
      }
    }

    // 2. Token didn't have email — try /userinfo so we can resolve the real account.
    if (!email) {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const response = await fetch(
            `https://${process.env.AUTH0_DOMAIN}/userinfo`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (response.ok) {
            const userInfo = (await response.json()) as {
              email: string;
              name?: string;
              nickname?: string;
            };
            email = userInfo.email;
            name = userInfo.name || userInfo.nickname || '';
          } else {
            console.error(
              `Auth0 /userinfo returned ${response.status}: ${await response
                .text()
                .catch(() => '<no body>')}`,
            );
          }
        } catch (e) {
          console.error('Failed to fetch userinfo from Auth0:', e);
        }
      }
    }

    if (!email) {
      throw new UnauthorizedException(
        'Could not resolve user identity from token. Please sign in again.',
      );
    }

    const isHardcodedSuperadmin = this.SUPERADMIN_EMAILS.includes(
      email.toLowerCase(),
    );

    // 3. Lookup by email (legacy users or first contact since auth0Sub was added)
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user?.isBanned) {
      throw new ForbiddenException('Your account has been banned');
    }

    if (user) {
      const updates: Record<string, unknown> = {};
      if (sub && user.auth0Sub !== sub) updates.auth0Sub = sub;
      if (isHardcodedSuperadmin && user.role !== Role.SUPERADMIN) {
        updates.role = Role.SUPERADMIN;
      }
      if (Object.keys(updates).length) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
      return user;
    }

    // 4. Brand-new user — create with both email and sub captured.
    return this.prisma.user.create({
      data: {
        email,
        name,
        auth0Sub: sub ?? null,
        role: isHardcodedSuperadmin ? Role.SUPERADMIN : Role.USER,
      },
    });
  }
}
