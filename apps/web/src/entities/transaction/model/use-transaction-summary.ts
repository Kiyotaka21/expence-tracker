'use client';

import type { TransactionSummaryQuery } from '@expence/contracts';
import { useQuery } from '@tanstack/react-query';

import { transactionApi, transactionKeys } from '../api/transaction-api';

export const useTransactionSummary = (query: TransactionSummaryQuery) =>
  useQuery({
    queryKey: transactionKeys.summary(query),
    queryFn: () => transactionApi.summary(query),
  });
