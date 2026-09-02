import { Module } from '@nestjs/common';

import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

/**
 * Модуль транзакций: CRUD и сводка за месяц на `/api/transactions`.
 *
 * `PrismaService` не импортируется: `PrismaModule` помечен `@Global()`.
 * Наружу модуль ничего не экспортирует — других потребителей `TransactionsService`
 * пока нет; появятся — сервис нужно будет добавить в `exports`.
 */
@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
