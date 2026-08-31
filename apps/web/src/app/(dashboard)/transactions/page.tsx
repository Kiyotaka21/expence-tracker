import type { Metadata } from 'next';

import { TransactionsPage } from '@/views/transactions';

export const metadata: Metadata = { title: 'Транзакции' };

export default function TransactionsRoute() {
  return <TransactionsPage />;
}
