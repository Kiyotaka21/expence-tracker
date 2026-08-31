'use client';

import type { TransactionListQuery } from '@expence/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { transactionApi, transactionKeys } from '../api/transaction-api';

export const useTransactions = (query: Partial<TransactionListQuery> = {}) =>
  useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => transactionApi.list(query),
    // Смена страницы и фильтров меняет ключ, то есть даёт новый запрос. Без
    // этого таблица на время загрузки мигала бы пустотой и прыгала по высоте.
    placeholderData: keepPreviousData,
  });
