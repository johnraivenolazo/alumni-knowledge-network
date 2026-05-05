import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
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
    'bgduque@neu.edu.ph',
    'olazoraiven@gmail.com',
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
    let email = (payload.email as string) || (payload['https://akn-api.com/email'] as string);
    let name = (payload.name as string) || (payload['https://akn-api.com/name'] as string);

    // If Auth0 access token doesn't include email, fetch from /userinfo
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
            const userInfo = await response.json();
            email = userInfo.email;
            name = userInfo.name || userInfo.nickname;
          }
        } catch (e) {
          console.error('Failed to fetch userinfo from Auth0:', e);
        }
      }
    }

    if (!email) {
      console.warn(
        'No email found in token or userinfo. Using sub as fallback.',
      );
      email = `${payload.sub}@fallback.akn`;
      name = name || 'Anonymous User';
    }

    // Direct Database Sync Logic (extracted from UsersService to break circular dependency)
    const isHardcodedSuperadmin = this.SUPERADMIN_EMAILS.includes(
      email.toLowerCase(),
    );

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user?.isBanned) {
      throw new ForbiddenException('Your account has been banned');
    }

    if (user) {
      if (isHardcodedSuperadmin && user.role !== Role.SUPERADMIN) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { role: Role.SUPERADMIN },
        });
      }
      return user;
    }

    // Create new user if not found
    return this.prisma.user.create({
      data: {
        email,
        name,
        role: isHardcodedSuperadmin ? Role.SUPERADMIN : Role.USER,
      },
    });
  }
}
