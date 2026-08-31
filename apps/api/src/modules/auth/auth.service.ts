import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { AuthUser, LoginDto, RegisterDto } from '@expence/contracts';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';

import type { AuthenticatedUser } from '../../common/types';
import type { Env } from '../../config/env.schema';
import { PrismaService } from '../../prisma/prisma.service';
import { toAuthUser } from '../users/user.mapper';
import { UsersService } from '../users/users.service';

const DAY_MS = 86_400_000;

/**
 * jsonwebtoken типизирует expiresIn шаблонным литералом ('30d'), а из числа
 * дней получается обычная string — сужаем её этим типом.
 */
type ExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshMaxAgeMs: number;
}

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

/** В БД лежит sha256 от refresh-токена: сам токен не восстановить, сверка дешёвая. */
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthUser> {
    const existing = await this.users.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }

    const user = await this.users.create({
      email: dto.email,
      name: dto.name ?? null,
      passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
    });

    return toAuthUser(user);
  }

  async validateCredentials(dto: LoginDto): Promise<AuthUser> {
    const user = await this.users.findByEmail(dto.email);

    // Хешируем даже когда пользователь не найден: иначе время ответа выдаёт,
    // зарегистрирован ли email.
    const passwordMatches = user
      ? await argon2.verify(user.passwordHash, dto.password)
      : await argon2.hash(dto.password, { type: argon2.argon2id }).then(() => false);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return toAuthUser(user);
  }

  async issueTokens(user: { id: string; email: string }, meta: SessionMeta): Promise<IssuedTokens> {
    const sessionId = randomUUID();
    const ttlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    const refreshMaxAgeMs = ttlDays * DAY_MS;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, email: user.email },
        {
          secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
          expiresIn: this.config.get('ACCESS_TOKEN_TTL', { infer: true }),
        },
      ),
      this.jwt.signAsync(
        { sub: user.id, email: user.email, sid: sessionId },
        {
          secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
          expiresIn: (ttlDays + 'd') as ExpiresIn,
        },
      ),
    ]);

    // issueTokens — единственный путь выдачи пары токенов, поэтому одна отметка
    // здесь покрывает register, login и refresh. Транзакция не нужна:
    // lastLoginAt — телеметрия, а не инвариант.
    await Promise.all([
      this.prisma.refreshSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          expiresAt: new Date(Date.now() + refreshMaxAgeMs),
          userAgent: meta.userAgent ?? null,
          ip: meta.ip ?? null,
        },
      }),
      this.users.touchLastLogin(user.id),
    ]);

    return { accessToken, refreshToken, refreshMaxAgeMs };
  }

  /** Ротация: старая сессия гасится, выдаётся новая пара токенов. */
  async rotateTokens(current: AuthenticatedUser, meta: SessionMeta): Promise<IssuedTokens> {
    if (!current.sessionId || !current.refreshToken) {
      throw new UnauthorizedException();
    }

    const session = await this.prisma.refreshSession.findUnique({
      where: { id: current.sessionId },
    });

    if (session?.revokedAt) {
      // Повторное использование отозванного токена — вероятная утечка.
      // Гасим все живые сессии пользователя.
      await this.prisma.refreshSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      throw new UnauthorizedException('Refresh-сессия отозвана');
    }

    const isValid =
      session !== null &&
      session.expiresAt > new Date() &&
      session.tokenHash === hashToken(current.refreshToken);

    if (!isValid) {
      throw new UnauthorizedException('Refresh-сессия недействительна');
    }

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({ id: current.id, email: current.email }, meta);
  }

  async revokeSession(sessionId: string | undefined): Promise<void> {
    if (!sessionId) return;

    await this.prisma.refreshSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    return toAuthUser(user);
  }
}
