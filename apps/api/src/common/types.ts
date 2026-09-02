/**
 * То, что кладут в `request.user` стратегии Passport.
 * `sessionId`/`refreshToken` заполняет только refresh-стратегия.
 */
export interface AuthenticatedUser {
  /** UUID пользователя. По нему сервисы ограничивают выборки владельцем. */
  id: string;
  /** Почта из токена. Транзакциям не нужна, используется в ответах auth. */
  email: string;
  /** Идентификатор refresh-сессии. Есть только на маршрутах `/api/auth/refresh` и `logout`. */
  sessionId?: string;
  /** Сырой refresh-токен для сверки с хешем при ротации. Заполняет refresh-стратегия. */
  refreshToken?: string;
}
