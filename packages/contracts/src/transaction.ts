/**
 * Контракт транзакций — единственный источник правды о форме запросов и ответов.
 * Отсюда схемы расходятся в три места: `createZodDto` в DTO Nest, схемы Swagger
 * и `zodResolver` в формах Next. Любая правка формы здесь ломающая: её сразу
 * видят обе стороны.
 */
import { z } from 'zod';

import {
  amountInputSchema,
  amountOutputSchema,
  currencySchema,
  paginated,
  paginationQuerySchema,
} from './common';
import { categorySchema } from './category';

/** Значения enum-а `transaction_type` в БД. Знак операции задаётся типом, а не суммой. */
export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;
/** Тип операции: доход или расход. */
export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

/** Тело `POST /api/transactions`. Обязательна только сумма, у остального есть умолчания. */
export const createTransactionSchema = z.object({
  amount: amountInputSchema,
  /** Умолчание совпадает с дефолтом колонки: без типа запись считается расходом. */
  type: transactionTypeSchema.default('EXPENSE'),
  currency: currencySchema.default('RUB'),
  categoryId: z.uuid().nullish(),
  /** Момент операции. Если не передан — берём текущее время на сервере. */
  occurredAt: z.iso.datetime().optional(),
  note: z.string().trim().max(500).nullish(),
});
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;

/**
 * Тело `PATCH /api/transactions/:id`: те же поля, все необязательные.
 * `undefined` означает «не менять», `null` у `categoryId` и `note` — «обнулить».
 */
export const updateTransactionSchema = createTransactionSchema.partial();
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;

/** Query `GET /api/transactions`: пагинация плюс необязательные фильтры. */
export const transactionListQuerySchema = paginationQuerySchema.extend({
  categoryId: z.uuid().optional(),
  type: transactionTypeSchema.optional(),
  /** Включительно. */
  from: z.iso.datetime().optional(),
  /** Включительно. */
  to: z.iso.datetime().optional(),
});
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

/**
 * Транзакция в ответе. Сумма — строка (см. `amountOutputSchema`), даты — ISO-строки,
 * категория вложена целиком или `null`, если её сняли либо удалили.
 */
export const transactionSchema = z.object({
  id: z.uuid(),
  amount: amountOutputSchema,
  type: transactionTypeSchema,
  currency: currencySchema,
  occurredAt: z.iso.datetime(),
  note: z.string().nullable(),
  category: categorySchema.nullable(),
  createdAt: z.iso.datetime(),
});
export type Transaction = z.infer<typeof transactionSchema>;

/** Страница транзакций: `items`, `total`, `page`, `limit`. */
export const transactionListSchema = paginated(transactionSchema);
export type TransactionList = z.infer<typeof transactionListSchema>;

/**
 * Сводка считается по одной валюте: складывать рубли с долларами нельзя,
 * а курсов в проекте нет. Месяц и год обязательны — умолчания скрыли бы,
 * за какой период пришли цифры.
 */
export const transactionSummaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  currency: currencySchema.default('RUB'),
});
export type TransactionSummaryQuery = z.infer<typeof transactionSummaryQuerySchema>;

/**
 * Строка разбивки сводки. Доходы и расходы по одной категории идут отдельными
 * строками, поэтому тип здесь обязателен, а `category` равна `null` для
 * транзакций без категории.
 */
export const categorySummarySchema = z.object({
  category: categorySchema.nullable(),
  type: transactionTypeSchema,
  total: amountOutputSchema,
});
export type CategorySummary = z.infer<typeof categorySummarySchema>;

/** Ответ `GET /api/transactions/summary`: итоги месяца и разбивка по категориям. */
export const transactionSummarySchema = z.object({
  month: z.number().int(),
  year: z.number().int(),
  currency: currencySchema,
  income: amountOutputSchema,
  expense: amountOutputSchema,
  /** Доходы минус расходы, поэтому может быть отрицательным. */
  balance: amountOutputSchema,
  byCategory: z.array(categorySummarySchema),
});
export type TransactionSummary = z.infer<typeof transactionSummarySchema>;
