'use client';

import type { TransactionListQuery } from '@expence/contracts';
import { useQuery } from '@tanstack/react-query';

import { transactionApi, transactionKeys } from '../api/transaction-api';

export const useTransactions = (query: Partial<TransactionListQuery> = {}) =>
  useQuery({
    queryKey: transactionKeys.list(query),
    queryFn: () => transactionApi.list(query),
  });
