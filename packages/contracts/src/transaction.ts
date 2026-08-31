import { z } from 'zod';

import {
  amountInputSchema,
  amountOutputSchema,
  currencySchema,
  paginated,
  paginationQuerySchema,
} from './common';
import { categorySchema } from './category';

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;
export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

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

export const updateTransactionSchema = createTransactionSchema.partial();
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;

export const transactionListQuerySchema = paginationQuerySchema.extend({
  categoryId: z.uuid().optional(),
  type: transactionTypeSchema.optional(),
  /** Включительно. */
  from: z.iso.datetime().optional(),
  /** Включительно. */
  to: z.iso.datetime().optional(),
});
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

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

export const categorySummarySchema = z.object({
  category: categorySchema.nullable(),
  type: transactionTypeSchema,
  total: amountOutputSchema,
});
export type CategorySummary = z.infer<typeof categorySummarySchema>;

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
