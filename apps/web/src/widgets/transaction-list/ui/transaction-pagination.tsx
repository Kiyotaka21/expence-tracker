'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/shared/ui/button';

/** Сколько номеров страниц показываем вокруг текущей. */
const WINDOW = 5;

/**
 * Окно номеров: при большом числе страниц полный список не помещается, а
 * многоточия без номеров не дают попасть на нужную страницу одним кликом.
 */
const pageWindow = (page: number, pageCount: number): number[] => {
  const start = Math.max(1, Math.min(page - Math.floor(WINDOW / 2), pageCount - WINDOW + 1));
  const end = Math.min(pageCount, start + WINDOW - 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

interface TransactionPaginationProps {
  page: number;
  pageCount: number;
  total: number;
  onChange: (page: number) => void;
}

/**
 * Своя пагинация вместо `pagination` из реестра shadcn: там ссылки `<a href>`,
 * а страница у нас — состояние React, не адрес. Ссылка без адреса ломает и
 * правый клик, и открытие в новой вкладке, поэтому здесь кнопки.
 */
export function TransactionPagination({
  page,
  pageCount,
  total,
  onChange,
}: TransactionPaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        Страница {page} из {pageCount} · всего операций: {total}
      </p>

      <nav aria-label="Страницы списка" className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Предыдущая страница"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeftIcon />
        </Button>

        {pageWindow(page, pageCount).map((number) => (
          <Button
            key={number}
            variant={number === page ? 'default' : 'ghost'}
            size="icon-sm"
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onChange(number)}
          >
            {number}
          </Button>
        ))}

        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Следующая страница"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRightIcon />
        </Button>
      </nav>
    </div>
  );
}
