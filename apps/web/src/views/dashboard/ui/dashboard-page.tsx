'use client';

import { CURRENCIES, type Currency } from '@expence/contracts';
import { CalendarIcon, CoinsIcon } from 'lucide-react';
import { useState } from 'react';

import { useSession, userFirstName } from '@/entities/session';
import { useTransactionSummary, useTransactions } from '@/entities/transaction';
import { formatMonth, formatMonthYear, pluralize } from '@/shared/lib/format';
import { ErrorAlert } from '@/shared/ui/error-alert';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import { PageHeader } from '@/shared/ui/page-header';
import { CreateMenu } from '@/widgets/create-menu';
import { ExpenseBreakdown } from '@/widgets/expense-breakdown';
import { MonthSummary } from '@/widgets/month-summary';
import { TransactionList } from '@/widgets/transaction-list';

/** Глубина списка периодов. Сводку бэкенд считает по месяцу, поэтому выбор — месяцами. */
const MONTHS_BACK = 12;

interface Period {
  year: number;
  month: number;
}

const currentPeriod = (): Period => {
  const now = new Date();

  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

/** Последние месяцы для выбора: от текущего назад. */
const periodOptions = (): Period[] => {
  const now = new Date();

  return Array.from({ length: MONTHS_BACK }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);

    return { year: date.getFullYear(), month: date.getMonth() + 1 };
  });
};

const periodValue = (period: Period): string => period.year + '-' + period.month;

/**
 * Главный экран: приветствие, выбор периода и валюты, сводка месяца, разбивка
 * расходов по категориям и список операций.
 *
 * Валюта и месяц — не декорация, а параметры запроса сводки: складывать рубли
 * с долларами нельзя, курсов в проекте нет, поэтому итоги всегда по одной
 * валюте, и её выбирают здесь.
 */
export function DashboardPage() {
  const [period, setPeriod] = useState<Period>(currentPeriod);
  const [currency, setCurrency] = useState<Currency>('RUB');

  const session = useSession();
  // Суммы считает бэкенд: складывать Decimal на клиенте нельзя.
  const summary = useTransactionSummary({ ...period, currency });
  // Счётчик операций: у запроса с limit: 1 свой ключ кэша, пагинацию списка
  // ниже он не задевает — нужен только total.
  const count = useTransactions({ limit: 1 });

  const monthLabel = formatMonth(period.year, period.month);
  const total = count.data?.total;

  const subtitle =
    formatMonthYear(period.year, period.month) +
    (total === undefined
      ? ''
      : ' · ' + total + ' ' + pluralize(total, ['операция', 'операции', 'операций']));

  return (
    <>
      <PageHeader
        title={'Привет, ' + (userFirstName(session.data) || 'это ваш бюджет') + ' \u{1f44b}'}
        description={subtitle}
      >
        {/* Иконка внутри контрола: у native-select своя разметка, поэтому
            отступ под неё задаётся селектором по вложенному select. */}
        <div className="relative [&_select]:pl-9">
          <CoinsIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <NativeSelect
            aria-label="Валюта итогов"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Currency)}
          >
            {CURRENCIES.map((item) => (
              <NativeSelectOption key={item} value={item}>
                {item}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="relative [&_select]:pl-9">
          <CalendarIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <NativeSelect
            aria-label="Период итогов"
            value={periodValue(period)}
            onChange={(event) => {
              const [year, month] = event.target.value.split('-');
              setPeriod({ year: Number(year), month: Number(month) });
            }}
          >
            {periodOptions().map((option) => (
              <NativeSelectOption key={periodValue(option)} value={periodValue(option)}>
                {formatMonthYear(option.year, option.month)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <CreateMenu />
      </PageHeader>

      {summary.error ? <ErrorAlert message={summary.error.message} /> : null}

      <MonthSummary
        income={summary.data?.income}
        expense={summary.data?.expense}
        balance={summary.data?.balance}
        currency={currency}
        monthLabel={monthLabel}
        isPending={summary.isPending}
      />

      <ExpenseBreakdown
        byCategory={summary.data?.byCategory}
        expense={summary.data?.expense}
        currency={currency}
        isPending={summary.isPending}
        monthLabel={monthLabel}
      />

      <TransactionList />
    </>
  );
}
