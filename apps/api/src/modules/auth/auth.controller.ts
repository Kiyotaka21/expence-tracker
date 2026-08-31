import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser, MessageResponse } from '@expence/contracts';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import type { AuthenticatedUser } from '../../common/types';
import type { Env } from '../../config/env.schema';
import { AuthService, type IssuedTokens, type SessionMeta } from './auth.service';
import { clearAuthCookies, setAccessCookie, setRefreshCookie, type CookieContext } from './cookies';
import { AuthUserResponseDto, LoginBodyDto, MessageResponseDto, RegisterBodyDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Регистрация и вход' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  async register(
    @Body() body: RegisterBodyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const user = await this.auth.register(body);
    await this.issue(user, req, res);

    return user;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход по email и паролю' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  async login(
    @Body() body: LoginBodyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const user = await this.auth.validateCredentials(body);
    await this.issue(user, req, res);

    return user;
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление пары токенов по refresh-cookie' })
  @ApiOkResponse({ type: MessageResponseDto })
  async refresh(
    @CurrentUser() current: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    const tokens = await this.auth.rotateTokens(current, this.sessionMeta(req));
    this.applyTokens(res, tokens);

    return { message: 'Токены обновлены' };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход: отзыв refresh-сессии и очистка cookie' })
  @ApiOkResponse({ type: MessageResponseDto })
  async logout(
    @CurrentUser() current: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    await this.auth.revokeSession(current.sessionId);
    clearAuthCookies(res, this.cookieContext());

    return { message: 'Сессия завершена' };
  }

  @ApiCookieAuth()
  @Get('me')
  @ApiOperation({ summary: 'Текущий пользователь' })
  @ApiOkResponse({ type: AuthUserResponseDto })
  me(@CurrentUser() current: AuthenticatedUser): Promise<AuthUser> {
    return this.auth.getProfile(current.id);
  }

  private async issue(user: AuthUser, req: Request, res: Response): Promise<void> {
    const tokens = await this.auth.issueTokens(
      { id: user.id, email: user.email },
      this.sessionMeta(req),
    );

    this.applyTokens(res, tokens);
  }

  private applyTokens(res: Response, tokens: IssuedTokens): void {
    const ctx = this.cookieContext();

    setAccessCookie(res, tokens.accessToken, ctx);
    setRefreshCookie(res, tokens.refreshToken, tokens.refreshMaxAgeMs, ctx);
  }

  private cookieContext(): CookieContext {
    return {
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      domain: this.config.get('COOKIE_DOMAIN', { infer: true }),
    };
  }

  private sessionMeta(req: Request): SessionMeta {
    return { userAgent: req.get('user-agent'), ip: req.ip };
  }
}
