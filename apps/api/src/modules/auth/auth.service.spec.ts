import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../../config/env.schema';
import type { PrismaService } from '../../prisma/prisma.service';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const DAY_MS = 86_400_000;
const TTL_DAYS = 30;
const NOW = new Date('2026-01-15T10:00:00.000Z');
const PASSWORD = 'Sup3r-secret';

/** Та же схема хеширования, что и в сервисе: в БД лежит sha256 от токена. */
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  createdAt: Date;
}

interface SessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
}

interface SessionCreateArgs {
  data: Omit<SessionRow, 'revokedAt'>;
}

interface SessionUpdateManyArgs {
  where: { id?: string; userId?: string; revokedAt: null };
  data: { revokedAt: Date };
}

/**
 * Хранилище сессий в памяти вместо мока вызовов: проверяем состояние после
 * ротации и отзыва, а не то, с какими аргументами позвали Prisma.
 */
const createPrismaStub = (initial: SessionRow[] = []) => {
  const sessions = [...initial];

  const refreshSession = {
    create: (args: SessionCreateArgs): Promise<SessionRow> => {
      const row: SessionRow = { ...args.data, revokedAt: null };
      sessions.push(row);
      return Promise.resolve(row);
    },
    findUnique: (args: { where: { id: string } }): Promise<SessionRow | null> =>
      Promise.resolve(sessions.find((session) => session.id === args.where.id) ?? null),
    update: (args: { where: { id: string }; data: { revokedAt: Date } }): Promise<SessionRow> => {
      const row = sessions.find((session) => session.id === args.where.id);

      if (!row) {
        throw new Error(`Сессия ${args.where.id} не найдена`);
      }

      row.revokedAt = args.data.revokedAt;

      return Promise.resolve(row);
    },
    updateMany: (args: SessionUpdateManyArgs): Promise<{ count: number }> => {
      const matched = sessions.filter(
        (session) =>
          (args.where.id === undefined || session.id === args.where.id) &&
          (args.where.userId === undefined || session.userId === args.where.userId) &&
          session.revokedAt === null,
      );

      for (const session of matched) {
        session.revokedAt = args.data.revokedAt;
      }

      return Promise.resolve({ count: matched.length });
    },
  };

  return { prisma: { refreshSession } as unknown as PrismaService, sessions };
};

const createUsersStub = (initial: UserRow[] = []) => {
  const rows = [...initial];
  const touched: string[] = [];

  const service = {
    findByEmail: (email: string): Promise<UserRow | null> =>
      Promise.resolve(rows.find((user) => user.email === email) ?? null),
    findById: (id: string): Promise<UserRow | null> =>
      Promise.resolve(rows.find((user) => user.id === id) ?? null),
    create: (data: {
      email: string;
      passwordHash: string;
      name?: string | null;
    }): Promise<UserRow> => {
      const row: UserRow = {
        id: `user-${rows.length + 1}`,
        email: data.email,
        name: data.name ?? null,
        passwordHash: data.passwordHash,
        createdAt: NOW,
      };

      rows.push(row);

      return Promise.resolve(row);
    },
    touchLastLogin: (id: string): Promise<void> => {
      touched.push(id);

      return Promise.resolve();
    },
  };

  return { users: service as unknown as UsersService, rows, touched };
};

interface SignedToken {
  payload: { sub: string; email: string; sid?: string };
  options: JwtSignOptions;
}

const createJwtStub = () => {
  const signed: SignedToken[] = [];

  const service = {
    signAsync: (payload: SignedToken['payload'], options: JwtSignOptions): Promise<string> => {
      signed.push({ payload, options });

      return Promise.resolve(`${payload.sid ? 'refresh' : 'access'}-${signed.length}`);
    },
  };

  return { jwt: service as unknown as JwtService, signed };
};

const createConfigStub = (): ConfigService<Env, true> => {
  const values = {
    JWT_ACCESS_SECRET: 'access-secret-not-shorter-than-32-chars',
    JWT_REFRESH_SECRET: 'refresh-secret-not-shorter-than-32-chars',
    ACCESS_TOKEN_TTL: '15m',
    REFRESH_TOKEN_TTL_DAYS: TTL_DAYS,
  };

  return {
    get: (key: keyof typeof values) => values[key],
  } as unknown as ConfigService<Env, true>;
};

let passwordHash: string;

beforeAll(async () => {
  // Один настоящий хеш на всю спеку: argon2id считается десятки миллисекунд.
  passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
}, 30_000);

const userRow = (overrides: Partial<UserRow> = {}): UserRow => ({
  id: 'user-1',
  email: 'ivan@example.com',
  name: 'Иван',
  passwordHash,
  createdAt: NOW,
  ...overrides,
});

const sessionRow = (overrides: Partial<SessionRow> = {}): SessionRow => ({
  id: 'session-1',
  userId: 'user-1',
  tokenHash: hashToken('refresh-1'),
  userAgent: null,
  ip: null,
  expiresAt: new Date(NOW.getTime() + TTL_DAYS * DAY_MS),
  revokedAt: null,
  ...overrides,
});

const setup = (options: { users?: UserRow[]; sessions?: SessionRow[] } = {}) => {
  const { prisma, sessions } = createPrismaStub(options.sessions);
  const { users, rows, touched } = createUsersStub(options.users);
  const { jwt, signed } = createJwtStub();

  return {
    service: new AuthService(prisma, users, jwt, createConfigStub()),
    sessions,
    rows,
    touched,
    signed,
  };
};

/** Текст ошибки промиса — чтобы сравнивать сообщения двух неудачных веток. */
const messageOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;

    return 'ошибки не было';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

afterEach(() => {
  vi.useRealTimers();
});

describe('AuthService.register', () => {
  it('отдаёт публичное представление пользователя без хеша пароля', async () => {
    const { service } = setup();

    await expect(
      service.register({ email: 'ivan@example.com', name: 'Иван', password: PASSWORD }),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'ivan@example.com',
      name: 'Иван',
      createdAt: '2026-01-15T10:00:00.000Z',
    });
  });

  it('сохраняет пароль хешем, а не в открытом виде', async () => {
    const { service, rows } = setup();

    await service.register({ email: 'ivan@example.com', password: PASSWORD });

    expect(rows[0].passwordHash).not.toBe(PASSWORD);
    await expect(argon2.verify(rows[0].passwordHash, PASSWORD)).resolves.toBe(true);
  });

  it('бросает ConflictException, когда email уже занят', async () => {
    const { service } = setup({ users: [userRow()] });

    await expect(
      service.register({ email: 'ivan@example.com', password: PASSWORD }),
    ).rejects.toThrow(new ConflictException('Пользователь с таким email уже зарегистрирован'));
  });
});

describe('AuthService.validateCredentials', () => {
  it('возвращает пользователя при верном пароле', async () => {
    const { service } = setup({ users: [userRow()] });

    await expect(
      service.validateCredentials({ email: 'ivan@example.com', password: PASSWORD }),
    ).resolves.toMatchObject({ id: 'user-1', email: 'ivan@example.com' });
  });

  it('бросает UnauthorizedException при неверном пароле', async () => {
    const { service } = setup({ users: [userRow()] });

    await expect(
      service.validateCredentials({ email: 'ivan@example.com', password: 'другой-пароль' }),
    ).rejects.toThrow(new UnauthorizedException('Неверный email или пароль'));
  });

  it('не раскрывает, зарегистрирован ли email: текст ошибки один и тот же', async () => {
    const { service } = setup({ users: [userRow()] });

    const unknownEmail = await messageOf(
      service.validateCredentials({ email: 'нет@example.com', password: PASSWORD }),
    );
    const wrongPassword = await messageOf(
      service.validateCredentials({ email: 'ivan@example.com', password: 'другой-пароль' }),
    );

    expect(unknownEmail).toBe(wrongPassword);
  });
});

describe('AuthService.issueTokens', () => {
  it('считает срок жизни refresh-cookie из TTL в днях', async () => {
    const { service } = setup();

    const tokens = await service.issueTokens({ id: 'user-1', email: 'ivan@example.com' }, {});

    expect(tokens.refreshMaxAgeMs).toBe(TTL_DAYS * DAY_MS);
  });

  it('кладёт в сессию хеш refresh-токена, а не сам токен', async () => {
    const { service, sessions } = setup();

    const tokens = await service.issueTokens({ id: 'user-1', email: 'ivan@example.com' }, {});

    expect(sessions[0].tokenHash).toBe(hashToken(tokens.refreshToken));
    expect(sessions[0].tokenHash).not.toBe(tokens.refreshToken);
  });

  it('связывает refresh-токен с созданной сессией через sid', async () => {
    const { service, sessions, signed } = setup();

    await service.issueTokens({ id: 'user-1', email: 'ivan@example.com' }, {});

    const refresh = signed.find((token) => token.payload.sid !== undefined);

    expect(refresh?.payload.sid).toBe(sessions[0].id);
  });

  it('ставит сессии срок из TTL в днях', async () => {
    vi.useFakeTimers({ now: NOW });
    const { service, sessions } = setup();

    await service.issueTokens({ id: 'user-1', email: 'ivan@example.com' }, {});

    expect(sessions[0].expiresAt.toISOString()).toBe('2026-02-14T10:00:00.000Z');
  });

  it('отмечает время последнего входа', async () => {
    const { service, touched } = setup();

    await service.issueTokens({ id: 'user-1', email: 'ivan@example.com' }, {});

    expect(touched).toEqual(['user-1']);
  });
});

describe('AuthService.rotateTokens', () => {
  // Живая сессия определяется сравнением с `new Date()` внутри сервиса, поэтому
  // время прогона фиксируем: иначе фикстуры протухают по календарю.
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  it('бросает UnauthorizedException, когда в токене нет сессии', async () => {
    const { service } = setup();

    await expect(
      service.rotateTokens({ id: 'user-1', email: 'ivan@example.com' }, {}),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('гасит все живые сессии пользователя при повторном использовании отозванной', async () => {
    const revoked = sessionRow({ id: 'session-1', revokedAt: new Date(NOW) });
    const live = sessionRow({ id: 'session-2', tokenHash: hashToken('refresh-2') });
    const foreign = sessionRow({ id: 'session-3', userId: 'user-2' });
    const { service, sessions } = setup({ sessions: [revoked, live, foreign] });

    await expect(
      service.rotateTokens(
        {
          id: 'user-1',
          email: 'ivan@example.com',
          sessionId: 'session-1',
          refreshToken: 'refresh-1',
        },
        {},
      ),
    ).rejects.toThrow(new UnauthorizedException('Refresh-сессия отозвана'));

    expect(sessions.find((session) => session.id === 'session-2')?.revokedAt).not.toBeNull();
    expect(sessions.find((session) => session.id === 'session-3')?.revokedAt).toBeNull();
  });

  it('отклоняет истёкшую сессию', async () => {
    const expired = sessionRow({ expiresAt: new Date(NOW.getTime() - DAY_MS) });
    const { service } = setup({ sessions: [expired] });

    await expect(
      service.rotateTokens(
        {
          id: 'user-1',
          email: 'ivan@example.com',
          sessionId: 'session-1',
          refreshToken: 'refresh-1',
        },
        {},
      ),
    ).rejects.toThrow(new UnauthorizedException('Refresh-сессия недействительна'));
  });

  it('отклоняет токен, не совпадающий с хешем сессии', async () => {
    const { service } = setup({ sessions: [sessionRow()] });

    await expect(
      service.rotateTokens(
        {
          id: 'user-1',
          email: 'ivan@example.com',
          sessionId: 'session-1',
          refreshToken: 'чужой-токен',
        },
        {},
      ),
    ).rejects.toThrow(new UnauthorizedException('Refresh-сессия недействительна'));
  });

  it('гасит старую сессию и заводит новую с хешем нового токена', async () => {
    const { service, sessions } = setup({ sessions: [sessionRow()] });

    const tokens = await service.rotateTokens(
      {
        id: 'user-1',
        email: 'ivan@example.com',
        sessionId: 'session-1',
        refreshToken: 'refresh-1',
      },
      { userAgent: 'vitest', ip: '127.0.0.1' },
    );

    expect(sessions[0].revokedAt).not.toBeNull();
    expect(sessions).toHaveLength(2);
    expect(sessions[1].tokenHash).toBe(hashToken(tokens.refreshToken));
  });
});

describe('AuthService.revokeSession', () => {
  it('ничего не делает без идентификатора сессии', async () => {
    const { service, sessions } = setup({ sessions: [sessionRow()] });

    await service.revokeSession(undefined);

    expect(sessions[0].revokedAt).toBeNull();
  });

  it('гасит только указанную сессию', async () => {
    const { service, sessions } = setup({
      sessions: [sessionRow(), sessionRow({ id: 'session-2' })],
    });

    await service.revokeSession('session-1');

    expect(sessions[0].revokedAt).not.toBeNull();
    expect(sessions[1].revokedAt).toBeNull();
  });
});

describe('AuthService.getProfile', () => {
  it('бросает UnauthorizedException, когда пользователя нет', async () => {
    const { service } = setup();

    await expect(service.getProfile('user-1')).rejects.toThrow(UnauthorizedException);
  });

  it('отдаёт публичное представление с датой в ISO', async () => {
    const { service } = setup({ users: [userRow()] });

    await expect(service.getProfile('user-1')).resolves.toEqual({
      id: 'user-1',
      email: 'ivan@example.com',
      name: 'Иван',
      createdAt: '2026-01-15T10:00:00.000Z',
    });
  });
});
