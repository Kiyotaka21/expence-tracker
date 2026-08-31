import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { jwtPayloadSchema } from '@expence/contracts';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { Env } from '../../../config/env.schema';
import type { AuthenticatedUser } from '../../../common/types';
import { REFRESH_TOKEN_COOKIE } from '../cookies';

const refreshCookieExtractor = (req: Request): string | null => {
  const token: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
  return typeof token === 'string' ? token : null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshCookieExtractor]),
      secretOrKey: config.get('JWT_REFRESH_SECRET', { infer: true }),
      ignoreExpiration: false,
      // Нужен сырой токен: его хеш сверяется с RefreshSession.tokenHash.
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: unknown): AuthenticatedUser {
    const parsed = jwtPayloadSchema.safeParse(payload);
    const token = refreshCookieExtractor(req);

    if (!parsed.success || !parsed.data.sid || !token) {
      throw new UnauthorizedException('Некорректный refresh-токен');
    }

    return {
      id: parsed.data.sub,
      email: parsed.data.email,
      sessionId: parsed.data.sid,
      refreshToken: token,
    };
  }
}
