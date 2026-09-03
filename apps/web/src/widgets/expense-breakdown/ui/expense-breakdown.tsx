'use client';

import type { CategorySummary, Currency } from '@expence/contracts';
import { useState } from 'react';

import { formatAmount, formatCompactAmount } from '@/shared/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Donut, type DonutSlice } from '@/shared/ui/donut';
import { Skeleton } from '@/shared/ui/skeleton';
import { cn } from '@/shared/lib/utils';

/**
 * Сколько дуг рисуем цветом. Слотов палитры шесть, и они проверены на
 * различимость именно в этом порядке — циклически повторять их нельзя, поэтому
 * хвост уходит в одну серую дугу «остальные».
 */
const MAX_SLICES = 6;

/** Резервные цвета: достаются категориям, у которых своего цвета в БД нет. */
const SLOT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];

interface ExpenseBreakdownProps {
  byCategory: CategorySummary[] | undefined;
  /** Итог расходов за месяц — знаменатель дуг. Считает его бэкенд. */
  expense: string | undefined;
  currency: Currency;
  isPending: boolean;
  monthLabel: string;
}

/**
 * Разбивка расходов по категориям кольцом и легендой.
 *
 * Цвет дуги — цвет категории из БД: он же стоит у её иконки в списках, и
 * перекрашивать его в палитру графика значило бы называть одну сущность двумя
 * цветами. Проверенные слоты достаются тем категориям, у которых цвета нет.
 * Опознать дугу по цвету при этом не требуется: каждую называет строка легенды
 * с точной суммой.
 */
export function ExpenseBreakdown({
  byCategory,
  expense,
  currency,
  isPending,
  monthLabel,
}: ExpenseBreakdownProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = (byCategory ?? [])
    .filter((row) => row.type === 'EXPENSE')
    .sort((left, right) => Number(right.total) - Number(left.total));

  const total = Number(expense ?? 0);
  const named = rows.slice(0, MAX_SLICES);

  const slices: DonutSlice[] = named.map((row, index) => {
    // Слоты палитры выдаём по порядку и только тем, у кого своего цвета нет:
    // иначе первой бесцветной категории достался бы слот по номеру строки.
    const slot = named.slice(0, index).filter((item) => !item.category?.color).length;

    return {
      id: row.category?.id ?? 'without-category',
      label: row.category?.name ?? 'Без категории',
      value: Number(row.total),
      valueLabel: formatAmount(row.total, currency),
      color: row.category?.color ?? SLOT_COLORS[slot] ?? 'var(--muted-foreground)',
    };
  });

  /*
   * Хвост показываем одной дугой. Её длина — остаток от итога сервера: это
   * геометрия, а не деньги, поэтому суммы у неё нет и в легенде тоже.
   */
  const restCount = rows.length - named.length;
  if (restCount > 0) {
    const namedLength = slices.reduce((sum, slice) => sum + slice.value, 0);

    slices.push({
      id: 'rest',
      label: 'Остальные категории: ' + restCount,
      value: Math.max(total - namedLength, 0),
      color: 'var(--muted-foreground)',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Расходы по категориям</CardTitle>
      </CardHeader>

      <CardContent>
        {isPending ? (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Skeleton className="size-[228px] shrink-0 rounded-full" />
            <div className="flex-1 space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          </div>
        ) : null}

        {!isPending && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Расходов за {monthLabel} пока нет. Добавьте операцию — разбивка появится здесь.
          </p>
        ) : null}

        {!isPending && rows.length > 0 ? (
          <div className="flex flex-col items-center gap-7 sm:flex-row sm:justify-center sm:gap-12">
            <Donut
              slices={slices}
              total={total}
              centerValue={formatCompactAmount(total, currency)}
              centerLabel={'всего за ' + monthLabel}
              hoveredId={hovered}
              onHover={setHovered}
              className="shrink-0"
            />

            <ul className="w-full flex-1 sm:max-w-[26rem]">
              {slices.map((slice) => (
                <li
                  key={slice.id}
                  onMouseEnter={() => setHovered(slice.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    'flex items-center justify-between gap-3 border-b border-border py-2.5 transition-colors last:border-0',
                    hovered === slice.id && 'bg-muted/60',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate text-sm">{slice.label}</span>
                  </span>

                  {slice.valueLabel ? (
                    <span className="shrink-0 font-heading text-sm font-semibold tabular-nums">
                      {slice.valueLabel}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
