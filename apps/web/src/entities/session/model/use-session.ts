'use client';

import { useQuery } from '@tanstack/react-query';

import { sessionApi, sessionKeys } from '../api/session-api';

/**
 * Текущий пользователь. 401 клиент лечит сам — один раз обновляет пару токенов
 * через /auth/refresh (см. shared/api/client), поэтому retry здесь не нужен.
 */
export const useSession = () =>
  useQuery({
    queryKey: sessionKeys.me,
    queryFn: sessionApi.me,
    retry: false,
  });
