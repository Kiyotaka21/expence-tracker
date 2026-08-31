import type { Transaction } from '@expence/contracts';

import { formatMoney } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';

import { TRANSACTION_TYPE_SIGNS } from '../lib/transaction-type';

type TransactionAmountProps = Pick<Transaction, 'amount' | 'currency' | 'type'> & {
  className?: string;
};

/**
 * Сумма операции: в БД она всегда положительная, направление задаёт тип —
 * отсюда знак и цвет. Живёт в сущности, потому что выглядит одинаково везде,
 * где показывают операцию, а `amount` приходит строкой и форматируется одинаково.
 */
export function TransactionAmount({ amount, currency, type, className }: TransactionAmountProps) {
  return (
    <span
      className={cn(
        'font-medium whitespace-nowrap',
        type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
        className,
      )}
    >
      {TRANSACTION_TYPE_SIGNS[type]}
      {formatMoney(amount)} {currency}
    </span>
  );
}
