/**
 * DTO модуля транзакций. Руками они не пишутся: `createZodDto(schema)` оборачивает
 * схему из `@expence/contracts`, и из одного описания получаются сразу валидация
 * (глобальный `ZodValidationPipe` проверяет по ней `@Body`/`@Query`/`@Param`) и
 * схема в Swagger. Меняете форму запроса или ответа — правьте контракт, не этот файл.
 *
 * `*ResponseDto` нужны только Swagger-декораторам: валидация ответов
 * (`ZodSerializerInterceptor`) сознательно не включена, форму ответа гарантируют
 * мапперы.
 */
import {
  createTransactionSchema,
  idParamSchema,
  transactionListQuerySchema,
  transactionListSchema,
  transactionSchema,
  transactionSummaryQuerySchema,
  transactionSummarySchema,
  updateTransactionSchema,
} from '@expence/contracts';
import { createZodDto } from 'nestjs-zod';

/** Параметр пути `:id`. Не UUID — 400 ещё до входа в обработчик. */
export class IdParamDto extends createZodDto(idParamSchema) {}

/** Тело `POST /api/transactions`. Обязательна только сумма, остальное с умолчаниями. */
export class CreateTransactionBodyDto extends createZodDto(createTransactionSchema) {}

/** Тело `PATCH /api/transactions/:id`: те же поля, все необязательные. */
export class UpdateTransactionBodyDto extends createZodDto(updateTransactionSchema) {}

/** Query `GET /api/transactions`: пагинация плюс фильтры по категории, типу и датам. */
export class TransactionListQueryDto extends createZodDto(transactionListQuerySchema) {}

/** Query `GET /api/transactions/summary`: обязательные месяц и год, валюта по умолчанию. */
export class TransactionSummaryQueryDto extends createZodDto(transactionSummaryQuerySchema) {}

/** Одна транзакция в ответе. */
export class TransactionResponseDto extends createZodDto(transactionSchema) {}

/** Страница транзакций в ответе: `items`, `total`, `page`, `limit`. */
export class TransactionListResponseDto extends createZodDto(transactionListSchema) {}

/** Сводка за месяц в ответе. */
export class TransactionSummaryResponseDto extends createZodDto(transactionSummarySchema) {}
