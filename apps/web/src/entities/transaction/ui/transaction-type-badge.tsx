import type { TransactionType } from '@expence/contracts';

import { cn } from '@/shared/lib/utils';

import { TRANSACTION_TYPE_LABELS } from '../lib/transaction-type';

/**
 * Тип операции таблеткой с точкой. Цвет здесь дублирует подпись, а не заменяет
 * её: доход от расхода отличается словом, точка и оттенок только помогают
 * поймать строку взглядом.
 */
export function TransactionTypeBadge({
  type,
  className,
}: {
  type: TransactionType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        type === 'INCOME' ? 'bg-income/12 text-income' : 'bg-expense/12 text-expense',
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {TRANSACTION_TYPE_LABELS[type]}
    </span>
  );
}
