import type { CookieOptions, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Refresh-токен нужен только эндпоинтам аутентификации, поэтому ограничиваем
 * путь: браузер не станет прикладывать его к остальным запросам.
 * Значение учитывает глобальный префикс `/api`.
 */
export const REFRESH_COOKIE_PATH = '/api/auth';

export interface CookieContext {
  secure: boolean;
  domain?: string;
}

const baseOptions = (ctx: CookieContext): CookieOptions => ({
  httpOnly: true,
  secure: ctx.secure,
  sameSite: 'lax',
  domain: ctx.domain,
});

/** Access-токен — сессионная cookie: срок жизни определяет сам JWT. */
export function setAccessCookie(res: Response, token: string, ctx: CookieContext): void {
  res.cookie(ACCESS_TOKEN_COOKIE, token, { ...baseOptions(ctx), path: '/' });
}

export function setRefreshCookie(
  res: Response,
  token: string,
  maxAgeMs: number,
  ctx: CookieContext,
): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...baseOptions(ctx),
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeMs,
  });
}

export function clearAuthCookies(res: Response, ctx: CookieContext): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseOptions(ctx), path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseOptions(ctx), path: REFRESH_COOKIE_PATH });
}
