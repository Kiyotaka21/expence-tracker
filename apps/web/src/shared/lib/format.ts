import type { Currency } from '@expence/contracts';

/**
 * Суммы приходят с API строками (в БД Decimal(12,2)). Приводим к числу только
 * для отображения — арифметика по деньгам остаётся на бэкенде.
 */
export const formatMoney = (value: string | number): string =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    typeof value === 'string' ? Number(value) : value,
  );

/** Знак валюты вместо кода: в интерфейсе «1 200,00 ₽» читается быстрее, чем «1 200,00 RUB». */
export const CURRENCY_SIGNS: Record<Currency, string> = {
  RUB: '\u20bd',
  USD: '$',
  EUR: '\u20ac',
};

/** Сумма со знаком валюты — основной вид денег в интерфейсе. */
export const formatAmount = (value: string | number, currency: Currency): string =>
  formatMoney(value) + '\u00a0' + CURRENCY_SIGNS[currency];

/**
 * Короткая запись для крупного кегля: «80 тыс. ₽». Нужна там, где сумма стоит
 * внутри графика и на полную запись места нет; точное значение в таких местах
 * всегда есть рядом — в легенде или в подписи.
 */
export const formatCompactAmount = (value: string | number, currency: Currency): string =>
  new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(
    typeof value === 'string' ? Number(value) : value,
  ) +
  '\u00a0' +
  CURRENCY_SIGNS[currency];

export const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('ru-RU');

/** Дата в списке операций: «14 марта» — год не повторяем, период задан фильтром. */
export const formatDayMonth = (iso: string): string =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

/**
 * Подпись периода сводки: «август 2026». Дату собираем в UTC и читаем в UTC —
 * иначе первое число месяца в отрицательных часовых поясах уезжало бы
 * в предыдущий месяц.
 */
export const formatMonthYear = (year: number, month: number): string =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** Только месяц: «август». Год в таких подписях уже стоит рядом. */
export const formatMonth = (year: number, month: number): string =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('ru-RU', {
    month: 'long',
    timeZone: 'UTC',
  });

/**
 * Склонение по числу: «1 операция», «2 операции», «5 операций».
 * Правило русского языка, поэтому живёт рядом с остальным форматированием.
 */
export const pluralize = (count: number, forms: [string, string, string]): string => {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;

  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];

  return forms[2];
};
