/**
 * То, что кладут в `request.user` стратегии Passport.
 * `sessionId`/`refreshToken` заполняет только refresh-стратегия.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  sessionId?: string;
  refreshToken?: string;
}
