import { DEFAULT_AUTHENTICATED_ROUTE, REDIRECT_QUERY_PARAM } from '@/shared/config/routes';

/**
 * Путь для возврата после логина приходит из query-параметра, то есть от
 * пользователя. Пропускаем только относительные пути: `//host` и `/\host`
 * браузер трактует как внешний адрес — это открытый редирект.
 */
export const safeInternalPath = (value: string | undefined, fallback: string): string => {
  if (!value?.startsWith('/')) return fallback;
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;

  return value;
};

/** Куда вести после входа или регистрации: `?from=` от proxy или дашборд. */
export const redirectAfterAuth = (
  params: Record<string, string | string[] | undefined>,
): string => {
  const from = params[REDIRECT_QUERY_PARAM];

  return safeInternalPath(typeof from === 'string' ? from : undefined, DEFAULT_AUTHENTICATED_ROUTE);
};
