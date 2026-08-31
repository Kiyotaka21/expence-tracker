/**
 * Имя cookie с access-токеном. Значение httpOnly и недоступно клиенту —
 * фронтенду нужен только сам факт наличия cookie (см. src/proxy.ts).
 * Должно совпадать с ACCESS_TOKEN_COOKIE в apps/api/src/modules/auth/cookies.ts.
 */
export const ACCESS_TOKEN_COOKIE = 'access_token';
