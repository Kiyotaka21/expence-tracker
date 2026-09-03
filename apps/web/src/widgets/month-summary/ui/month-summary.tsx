import type { Currency } from '@expence/contracts';
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';

import { formatAmount } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';

interface MonthSummaryProps {
  /** Суммы приходят строками с API. Виджет их не складывает — только показывает. */
  income: string | undefined;
  expense: string | undefined;
  balance: string | undefined;
  currency: Currency;
  /** «август» — подпись периода, за который посчитаны суммы. */
  monthLabel: string;
  isPending: boolean;
}

/**
 * Доля дохода, которая уже израсходована. Это отношение, а не сумма: деньги
 * по-прежнему приходят с сервера готовыми, здесь считается только длина полосы.
 */
const spentShare = (income: string | undefined, expense: string | undefined): number | null => {
  const incomeValue = Number(income ?? 0);
  const expenseValue = Number(expense ?? 0);

  if (!Number.isFinite(incomeValue) || incomeValue <= 0) return null;

  return Math.round((expenseValue / incomeValue) * 100);
};

/** Цвет полосы — состояние, а не украшение: к перерасходу она краснеет. */
const meterTone = (share: number): string => {
  if (share > 100) return 'text-expense';
  if (share > 70) return 'text-[var(--chart-3)]';

  return 'text-primary';
};

/**
 * Сводка месяца: баланс крупно и две пастельные плитки с доходом и расходом.
 * Данные приходят пропсами — запрос делает экран, а тот же ответ нужен ещё и
 * разбивке по категориям.
 */
export function MonthSummary({
  income,
  expense,
  balance,
  currency,
  monthLabel,
  isPending,
}: MonthSummaryProps) {
  const value = (amount: string | undefined): string =>
    isPending || amount === undefined ? '—' : formatAmount(amount, currency);

  const negative = balance !== undefined && Number(balance) < 0;
  const share = isPending ? null : spentShare(income, expense);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="flex flex-col justify-between rounded-2xl bg-muted p-6 lg:col-span-2">
        <div>
          {/*
           * Единственная крупная цифра экрана. Начертания пропорциональные:
           * tabular-nums на таком кегле разряжает число и выглядит рыхло.
           */}
          <p
            className={cn(
              'font-heading text-[2.25rem] leading-none font-extrabold sm:text-5xl',
              negative && 'text-expense',
            )}
          >
            {value(balance)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Баланс за {monthLabel}</p>
        </div>

        {share === null ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {isPending ? 'Считаем итоги месяца...' : 'Доходов за этот месяц пока нет'}
          </p>
        ) : (
          <div className={cn('mt-6', meterTone(share))}>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-current/15"
              role="img"
              aria-label={'Израсходовано ' + share + '% доходов'}
            >
              <div
                className="h-full rounded-full bg-current"
                style={{ width: Math.min(share, 100) + '%' }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Израсходовано {share}% доходов за {monthLabel}
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <section className="flex items-start justify-between gap-4 rounded-2xl bg-tint-blue p-5">
          <div className="min-w-0">
            <p className="font-heading text-2xl leading-tight font-extrabold">{value(income)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Доходы</p>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card text-income dark:bg-white/10">
            <TrendingUpIcon className="size-5" aria-hidden />
          </span>
        </section>

        <section className="flex items-start justify-between gap-4 rounded-2xl bg-tint-violet p-5">
          <div className="min-w-0">
            <p className="font-heading text-2xl leading-tight font-extrabold">{value(expense)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Расходы</p>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card text-expense dark:bg-white/10">
            <TrendingDownIcon className="size-5" aria-hidden />
          </span>
        </section>
      </div>
    </div>
  );
}
