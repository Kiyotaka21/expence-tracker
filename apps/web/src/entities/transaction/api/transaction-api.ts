import type {
  CreateTransactionDto,
  Transaction,
  TransactionList,
  TransactionListQuery,
  TransactionSummary,
  TransactionSummaryQuery,
  UpdateTransactionDto,
} from '@expence/contracts';

import { api } from '@/shared/api/client';

export const transactionApi = {
  list: (query: Partial<TransactionListQuery> = {}) =>
    api.get<TransactionList>('/transactions', {
      query: {
        page: query.page,
        limit: query.limit,
        categoryId: query.categoryId,
        type: query.type,
        from: query.from,
        to: query.to,
      },
    }),
  summary: (query: TransactionSummaryQuery) =>
    api.get<TransactionSummary>('/transactions/summary', {
      query: { month: query.month, year: query.year, currency: query.currency },
    }),
  get: (id: string) => api.get<Transaction>('/transactions/' + id),
  create: (dto: CreateTransactionDto) => api.post<Transaction>('/transactions', dto),
  update: (id: string, dto: UpdateTransactionDto) =>
    api.patch<Transaction>('/transactions/' + id, dto),
  remove: (id: string) => api.delete<void>('/transactions/' + id),
};

export const transactionKeys = {
  /** Префикс всех запросов: инвалидация по нему гасит и списки, и сводку. */
  all: ['transactions'] as const,
  list: (query: Partial<TransactionListQuery> = {}) => ['transactions', 'list', query] as const,
  summary: (query: TransactionSummaryQuery) => ['transactions', 'summary', query] as const,
};
