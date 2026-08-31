/**
 * Суммы приходят с API строками (в БД Decimal(12,2)). Приводим к числу только
 * для отображения — арифметика по деньгам остаётся на бэкенде.
 */
export const formatMoney = (value: string | number): string =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    typeof value === 'string' ? Number(value) : value,
  );

export const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('ru-RU');
