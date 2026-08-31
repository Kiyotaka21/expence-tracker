import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Проверяет refresh-токен из cookie. Ставится точечно на POST /auth/refresh. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
