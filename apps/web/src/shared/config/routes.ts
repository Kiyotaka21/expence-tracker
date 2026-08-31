/** Пути приложения в одном месте: их знают и proxy, и навигация после логина. */
export const ROUTES = {
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  transactions: '/transactions',
  categories: '/categories',
  terms: '/terms',
  privacy: '/privacy',
} as const;

/** Вход и регистрация: с активной сессией на этих страницах делать нечего. */
export const AUTH_ROUTES = [ROUTES.login, ROUTES.register] as const;

/**
 * Правовые документы. Открыты всем: ссылки на них стоят в форме регистрации,
 * то есть читают их как раз до появления сессии.
 */
export const LEGAL_ROUTES = [ROUTES.terms, ROUTES.privacy] as const;

/** Маршруты, доступные без сессии. Всё остальное proxy отправляет на логин. */
export const PUBLIC_ROUTES = [...AUTH_ROUTES, ...LEGAL_ROUTES] as const;

/** Куда уходит пользователь после успешного входа, если возвращаться некуда. */
export const DEFAULT_AUTHENTICATED_ROUTE = ROUTES.dashboard;

/** Имя query-параметра, в котором proxy передаёт исходный путь на страницу входа. */
export const REDIRECT_QUERY_PARAM = 'from';
