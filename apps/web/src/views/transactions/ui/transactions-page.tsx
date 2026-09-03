'use client';

import { TransactionForm } from '@/features/transaction/transaction-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/page-header';
import { TransactionList } from '@/widgets/transaction-list';

export function TransactionsPage() {
  return (
    <>
      <PageHeader title="Операции" description="Записывайте доходы и расходы" />

      <Card>
        <CardHeader>
          <CardTitle>Новая операция</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm />
        </CardContent>
      </Card>

      {/* Здесь страница целиком про историю, поэтому список длиннее, чем на
          главном экране. */}
      <TransactionList pageSize={20} />
    </>
  );
}
