import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import type { Env } from '../config/env.schema';
// Клиент появится после `pnpm --filter api db:generate`.
import { PrismaClient } from '../generated/prisma/client';

/**
 * `PrismaClient` как провайдер Nest: наследование даёт сервисам доступ ко всем
 * методам клиента (`this.prisma.transaction.findMany` и прочим), а хуки жизненного
 * цикла привязывают соединение к жизни приложения.
 *
 * Провайдится глобальным `PrismaModule`, поэтому модулям вроде `transactions`
 * импортировать его не нужно. Вместе с `users.repository.ts` это единственные
 * места, знающие о сгенерированном клиенте.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Собирает клиент поверх driver adapter для PostgreSQL.
   *
   * @param config - Конфиг приложения; строка подключения берётся из `DATABASE_URL`,
   * уже проверенного `validateEnv` на старте.
   * @throws {Error} Prisma 7 не работает без driver adapter — без него конструктор
   * `PrismaClient` бросает ошибку. Само подключение здесь ещё не открывается.
   */
  constructor(config: ConfigService<Env, true>) {
    // Prisma 7 не работает без driver adapter: new PrismaClient() без него бросает ошибку.
    super({
      adapter: new PrismaPg({ connectionString: config.get('DATABASE_URL', { infer: true }) }),
    });
  }

  /**
   * Открывает соединение с БД на старте приложения.
   *
   * Подключаемся явно, а не лениво на первом запросе: недоступная база должна
   * ронять запуск, а не первый пользовательский запрос.
   *
   * @returns Ничего: промис резолвится после успешного подключения.
   * @throws {Error} Ошибка подключения Prisma (`PrismaClientInitializationError`) —
   * база недоступна или строка подключения неверна. Nest не поднимет приложение.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Подключение к PostgreSQL установлено');
  }

  /**
   * Закрывает пул соединений при остановке приложения.
   *
   * @returns Ничего: промис резолвится после закрытия пула.
   * @throws {Error} Ошибка Prisma при закрытии соединения. На практике при штатной
   * остановке не возникает.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
