import type { AuthUser, LoginDto, MessageResponse, RegisterDto } from '@expence/contracts';

import { api } from '@/shared/api/client';

/**
 * Все четыре эндпоинта работают с одной и той же парой httpOnly cookie —
 * ответы возвращают только публичное представление пользователя.
 */
export const sessionApi = {
  register: (dto: RegisterDto) => api.post<AuthUser>('/auth/register', dto),
  login: (dto: LoginDto) => api.post<AuthUser>('/auth/login', dto),
  logout: () => api.post<MessageResponse>('/auth/logout'),
  me: () => api.get<AuthUser>('/auth/me'),
};

/** Ключи кэша TanStack Query — рядом с запросами, чтобы инвалидация не разъезжалась. */
export const sessionKeys = {
  me: ['session', 'me'] as const,
};
