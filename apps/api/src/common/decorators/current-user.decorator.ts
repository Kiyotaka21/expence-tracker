import { UnauthorizedException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../types';

/**
 * Параметр-декоратор `@CurrentUser()`: достаёт из запроса пользователя, которого
 * положила туда стратегия Passport.
 *
 * Обычно к моменту вызова `request.user` уже заполнен глобальным `JwtAuthGuard`.
 * Проверка нужна для случаев, когда обработчик помечен `@Public()`, а декоратор
 * забыли убрать: без неё в сервис уехал бы `undefined` вместо пользователя, и
 * запрос молча ушёл бы в чужие данные или упал бы уже в Prisma.
 *
 * @param _data - Аргумент декоратора. Не используется: пользователь всегда
 * отдаётся целиком.
 * @param context - Контекст выполнения Nest; берётся HTTP-запрос.
 * @returns Пользователя из `request.user`.
 * @throws {UnauthorizedException} 401 — в запросе нет пользователя: маршрут
 * открыт `@Public()` или гвард по какой-то причине не отработал.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    return request.user;
  },
);
