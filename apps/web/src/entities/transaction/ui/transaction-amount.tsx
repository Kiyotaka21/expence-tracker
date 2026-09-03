import type { Transaction } from '@expence/contracts';

import { formatAmount } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';

import { TRANSACTION_TYPE_SIGNS } from '../lib/transaction-type';

type TransactionAmountProps = Pick<Transaction, 'amount' | 'currency' | 'type'> & {
  className?: string;
};

/**
 * Сумма операции: в БД она всегда положительная, направление задаёт тип —
 * отсюда знак и цвет. Живёт в сущности, потому что выглядит одинаково везде,
 * где показывают операцию, а `amount` приходит строкой и форматируется одинаково.
 *
 * Знак стоит перед суммой всегда: по одному цвету направление операции читать
 * нельзя.
 */
export function TransactionAmount({ amount, currency, type, className }: TransactionAmountProps) {
  return (
    <span
      className={cn(
        'font-heading font-semibold whitespace-nowrap tabular-nums',
        type === 'INCOME' ? 'text-income' : 'text-expense',
        className,
      )}
    >
      {TRANSACTION_TYPE_SIGNS[type]}
      {formatAmount(amount, currency)}
    </span>
  );
}
