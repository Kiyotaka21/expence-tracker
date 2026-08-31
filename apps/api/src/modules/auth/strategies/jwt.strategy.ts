import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { jwtPayloadSchema } from '@expence/contracts';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { Env } from '../../../config/env.schema';
import type { AuthenticatedUser } from '../../../common/types';
import { ACCESS_TOKEN_COOKIE } from '../cookies';

const accessCookieExtractor = (req: Request): string | null => {
  const token: unknown = req.cookies?.[ACCESS_TOKEN_COOKIE];
  return typeof token === 'string' ? token : null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([accessCookieExtractor]),
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
      ignoreExpiration: false,
    });
  }

  validate(payload: unknown): AuthenticatedUser {
    const parsed = jwtPayloadSchema.safeParse(payload);

    if (!parsed.success) {
      throw new UnauthorizedException('Некорректный токен');
    }

    return { id: parsed.data.sub, email: parsed.data.email };
  }
}
