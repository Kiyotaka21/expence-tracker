'use client';

import { useTransactionSummary } from '@/entities/transaction';
import { formatMonthYear, formatMoney } from '@/shared/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { ErrorAlert } from '@/shared/ui/error-alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { CategoryList } from '@/widgets/category-list';
import { CreateMenu } from '@/widgets/create-menu';
import { ProfileCard } from '@/widgets/profile-card';
import { TransactionList } from '@/widgets/transaction-list';

const currentPeriod = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear(), currency: 'RUB' as const };
};

/**
 * Главный экран: сводка за месяц, профиль, меню создания и список операций с
 * пагинацией. Списки и меню — виджеты: те же самые показывают страницы
 * `/transactions` и `/categories`, здесь только композиция.
 */
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold">Главная</h1>
          <p className="text-sm text-muted-foreground">
            Доходы и расходы за {formatMonthYear(period.year, period.month)}, {period.currency}
          </p>
        </div>

        <CreateMenu />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Доходы</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
            {value(summary.data?.income)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Расходы</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive tabular-nums">
            {value(summary.data?.expense)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Баланс</CardTitle>
          </CardHeader>
          <CardContent
            className={
              isNegative
                ? 'text-2xl font-semibold text-destructive tabular-nums'
                : 'text-2xl font-semibold tabular-nums'
            }
          >
            {value(balance)}
          </CardContent>
        </Card>

        <ProfileCard />
      </div>

      {summary.error ? <ErrorAlert message={summary.error.message} /> : null}

      {/* Разделы на одном экране: переход по маршрутам нужен, только если
          страницу хочется открыть отдельной ссылкой. */}
      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Транзакции</TabsTrigger>
          <TabsTrigger value="categories">Категории</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <TransactionList />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryList />
        </TabsContent>
      </Tabs>
    </>
  );
}
