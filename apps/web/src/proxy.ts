import { NextResponse, type NextRequest } from 'next/server';

import {
  AUTH_ROUTES,
  DEFAULT_AUTHENTICATED_ROUTE,
  PUBLIC_ROUTES,
  REDIRECT_QUERY_PARAM,
  ROUTES,
} from '@/shared/config/routes';
import { ACCESS_TOKEN_COOKIE } from '@/shared/config/session';

/**
 * В Next 16 middleware переименован в proxy (файл + имя функции).
 *
 * Мягкая проверка: cookie httpOnly, поэтому здесь видно только её наличие,
 * но не валидность JWT. Cookie ставит API на localhost:4000 — браузер не
 * различает порты, поэтому на localhost:3000 она доступна.
 * Реальную авторизацию по-прежнему делает бэкенд.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE);
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthPage = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.search = '';
    // Запомним, куда шёл пользователь: форма входа вернёт его туда же.
    url.searchParams.set(REDIRECT_QUERY_PARAM, pathname + search);

    return NextResponse.redirect(url);
  }

  // Уводим с логина и регистрации, но не с правовых страниц: их читают и с сессией.
  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = DEFAULT_AUTHENTICATED_ROUTE;
    url.search = '';

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
