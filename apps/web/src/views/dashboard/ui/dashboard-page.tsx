'use client';

import { useTransactionSummary } from '@/entities/transaction';
import { formatMoney } from '@/shared/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ErrorAlert } from '@/shared/ui/error-alert';

const currentPeriod = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear(), currency: 'RUB' as const };
};

export function DashboardPage() {
  // Суммы считает бэкенд: складывать Decimal на клиенте нельзя, а сводка
  // к тому же ограничена одной валютой — курсов в проекте нет.
  const period = currentPeriod();
  const summary = useTransactionSummary(period);

  const value = (amount: string | undefined): string =>
    summary.isPending || amount === undefined ? '—' : formatMoney(amount);

  const balance = summary.data?.balance;
  const isNegative = balance !== undefined && Number(balance) < 0;

  return (
    <>
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Обзор</h1>
        <p className="text-sm text-muted-foreground">
          Доходы и расходы за текущий месяц, {period.currency}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Доходы</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
            {value(summary.data?.income)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Расходы</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-destructive">
            {value(summary.data?.expense)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Баланс</CardTitle>
          </CardHeader>
          <CardContent
            className={
              isNegative ? 'text-3xl font-semibold text-destructive' : 'text-3xl font-semibold'
            }
          >
            {value(balance)}
          </CardContent>
        </Card>
      </div>

      {summary.error ? <ErrorAlert message={summary.error.message} /> : null}
    </>
  );
}
