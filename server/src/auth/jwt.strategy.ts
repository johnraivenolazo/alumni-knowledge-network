import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
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

  async validate(req: any, payload: any) {
    let email = payload.email || payload['https://akn-api.com/email'];
    let name = payload.name || payload['https://akn-api.com/name'];

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
      // Fallback if still no email (Prisma requires it)
      console.warn(
        'No email found in token or userinfo. Using sub as fallback.',
      );
      email = `${payload.sub}@fallback.akn`;
      name = name || 'Anonymous User';
    }

    // Sync user with our database
    const user = await this.usersService.findOrCreateUser(email, name);
    return user;
  }
}
