'use client';

import { useState } from 'react';

import { CategoryIcon } from '@/entities/category';
import {
  TRANSACTION_TYPE_LABELS,
  TransactionAmount,
  useTransactions,
} from '@/entities/transaction';
import { DeleteTransactionButton } from '@/features/transaction/delete-transaction';
import { formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ErrorAlert } from '@/shared/ui/error-alert';
import { Skeleton } from '@/shared/ui/skeleton';

import {
  EMPTY_FILTERS,
  TransactionFilters,
  isFiltered,
  type TransactionFiltersValue,
} from './transaction-filters';
import { TransactionPagination } from './transaction-pagination';

/** Заглушка на время первой загрузки: ровно страница строк, чтобы не прыгала высота. */
function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-6 w-full" />
      ))}
    </div>
  );
}

interface TransactionListProps {
  /** Размер страницы. По умолчанию 10 — столько показывает главный экран. */
  pageSize?: number;
}

/**
 * Список операций с фильтрами и пагинацией. Состояние (страница и фильтры)
 * держит сам виджет: его показывают и главный экран, и страница транзакций,
 * и обоим незачем знать про постраничную навигацию. В URL страница не уезжает
 * намеренно — иначе тремя значениями пришлось бы синхронизировать адрес.
 */
export function TransactionList({ pageSize = 10 }: TransactionListProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFiltersValue>(EMPTY_FILTERS);

  const transactions = useTransactions({
    page,
    limit: pageSize,
    type: filters.type || undefined,
    categoryId: filters.categoryId || undefined,
  });

  const items = transactions.data?.items ?? [];
  const total = transactions.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  /*
   * Запись была на странице последней — после удаления такой страницы уже нет.
   * Уходим на предыдущую по событию от кнопки, а не эффектом на изменившийся
   * total: setState в эффекте запрещён (react-hooks/set-state-in-effect) и
   * стоит лишнего рендера.
   */
  const handleDeleted = (): void => {
    if (items.length === 1 && page > 1) {
      setPage(page - 1);
    }
  };

  const changeFilters = (next: TransactionFiltersValue): void => {
    setFilters(next);
    // После сужения выборки страницы с таким номером может не быть.
    setPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Операции</CardTitle>
        <CardAction>
          <TransactionFilters value={filters} onChange={changeFilters} />
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        {transactions.error ? <ErrorAlert message={transactions.error.message} /> : null}

        {transactions.isPending ? <ListSkeleton rows={pageSize} /> : null}

        {transactions.data && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isFiltered(filters) ? 'Под фильтры ничего не подошло' : 'Пока ни одной транзакции'}
          </p>
        ) : null}

        {items.length > 0 ? (
          <div
            className={cn(
              'overflow-x-auto transition-opacity',
              // Данные предыдущей страницы, пока грузится следующая.
              transactions.isPlaceholderData && 'opacity-60',
            )}
          >
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
                    <td className="py-2 pr-4">
                      {transaction.category ? (
                        <span className="flex items-center gap-2">
                          <CategoryIcon
                            slug={transaction.category.icon}
                            color={transaction.category.color}
                            className="size-4"
                          />
                          {transaction.category.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{transaction.note ?? ''}</td>
                    <td className="py-2 pr-4 text-right">
                      <TransactionAmount
                        amount={transaction.amount}
                        currency={transaction.currency}
                        type={transaction.type}
                      />
                    </td>
                    <td className="py-2 text-right">
                      <DeleteTransactionButton id={transaction.id} onDeleted={handleDeleted} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {pageCount > 1 ? (
          <TransactionPagination
            page={page}
            pageCount={pageCount}
            total={total}
            onChange={setPage}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
