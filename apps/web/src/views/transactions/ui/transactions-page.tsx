'use client';

import { TransactionForm } from '@/features/transaction/transaction-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { TransactionList } from '@/widgets/transaction-list';

export function TransactionsPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Транзакции</h1>
        <p className="text-sm text-muted-foreground">Записывайте доходы и расходы</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Новая транзакция</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm />
        </CardContent>
      </Card>

      {/* Здесь страница целиком про историю, поэтому страница списка длиннее,
          чем на главном экране. */}
      <TransactionList pageSize={20} />
    </>
  );
}
