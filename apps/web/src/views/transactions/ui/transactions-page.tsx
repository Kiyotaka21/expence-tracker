'use client';

import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_SIGNS,
  useTransactions,
} from '@/entities/transaction';
import { DeleteTransactionButton } from '@/features/transaction/delete-transaction';
import { TransactionForm } from '@/features/transaction/transaction-form';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ErrorAlert } from '@/shared/ui/error-alert';

const LIST_QUERY = { limit: 50 };

export function TransactionsPage() {
  const transactions = useTransactions(LIST_QUERY);
  const items = transactions.data?.items ?? [];

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

      <Card>
        <CardHeader>
          <CardTitle>История</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {transactions.isPending ? (
            <p className="text-sm text-muted-foreground">Загружаем...</p>
          ) : null}
          {transactions.error ? <ErrorAlert message={transactions.error.message} /> : null}

          {transactions.data && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока ни одной транзакции</p>
          ) : null}

          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Дата</th>
                    <th className="py-2 pr-4 font-medium">Тип</th>
                    <th className="py-2 pr-4 font-medium">Категория</th>
                    <th className="py-2 pr-4 font-medium">Комментарий</th>
                    <th className="py-2 pr-4 text-right font-medium">Сумма</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((transaction) => (
                    <tr key={transaction.id} className="border-t">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {formatDate(transaction.occurredAt)}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {TRANSACTION_TYPE_LABELS[transaction.type]}
                      </td>
                      <td className="py-2 pr-4">{transaction.category?.name ?? '—'}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{transaction.note ?? ''}</td>
                      <td
                        className={cn(
                          'py-2 pr-4 text-right font-medium whitespace-nowrap',
                          transaction.type === 'INCOME'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-destructive',
                        )}
                      >
                        {TRANSACTION_TYPE_SIGNS[transaction.type]}
                        {transaction.amount} {transaction.currency}
                      </td>
                      <td className="py-2 text-right">
                        <DeleteTransactionButton id={transaction.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
