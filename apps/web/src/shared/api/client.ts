import { env } from '@/shared/config/env';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, QueryValue>;
}

const buildUrl = (path: string, query?: Record<string, QueryValue>): string => {
  const url = env.NEXT_PUBLIC_API_URL + path;

  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? url + '?' + qs : url;
};

const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const errorMessage = (payload: unknown, fallback: string): string => {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }

  return fallback;
};

async function send<T>(path: string, options: RequestOptions, allowRefresh: boolean): Promise<T> {
  const { body, query, headers, ...rest } = options;

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    // Токены лежат в httpOnly cookie, поэтому запросы всегда с credentials.
    credentials: 'include',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && allowRefresh && path !== '/auth/refresh') {
    // Access-токен истёк — один раз пробуем обновить пару и повторить запрос.
    const refreshed = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });

    if (refreshed.ok) {
      return send<T>(path, options, false);
    }
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(payload, 'Ошибка запроса'), payload);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options: RequestOptions = {}) =>
    send<T>(path, { ...options, method: 'GET' }, true),
  post: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    send<T>(path, { ...options, method: 'POST', body }, true),
  patch: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    send<T>(path, { ...options, method: 'PATCH', body }, true),
  delete: <T>(path: string, options: RequestOptions = {}) =>
    send<T>(path, { ...options, method: 'DELETE' }, true),
};
