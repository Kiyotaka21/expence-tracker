import type {
  CategorySummary,
  Currency,
  Transaction,
  TransactionSummary,
  TransactionType,
} from '@expence/contracts';

import { toCategory } from '../categories/category.mapper';

/**
 * Минимум, который нужен от `Decimal` Prisma. Структурный тип вместо импорта из
 * сгенерированного клиента: мапперы намеренно о Prisma не знают.
 */
interface DecimalLike {
  /** @param digits - Число знаков после запятой. */
  toFixed: (digits: number) => string;
}

/** Строка транзакции из БД с подгруженной категорией — то, что принимает маппер. */
interface TransactionLike {
  id: string;
  amount: DecimalLike;
  type: string;
  currency: string;
  occurredAt: Date;
  note: string | null;
  createdAt: Date;
  category: Parameters<typeof toCategory>[0] | null;
}

/**
 * Приводит строку транзакции из БД к форме контракта: суммы — строкой,
 * даты — ISO-строкой, категория — вложенным объектом или `null`.
 *
 * `type` и `currency` в БД шире контракта (`string`), поэтому сужаются
 * приведением: значения ограничены enum-ом Prisma и колонкой `varchar(3)`.
 *
 * @param row - Строка транзакции с подгруженной связью `category`.
 * @returns Транзакция в форме контракта `@expence/contracts`.
 * @throws Исключений не бросает.
 */
export const toTransaction = (row: TransactionLike): Transaction => ({
  id: row.id,
  // Prisma отдаёт Decimal. Приводим к строке с двумя знаками, чтобы по пути
  // к клиенту не появился float и не потерялась точность.
  amount: row.amount.toFixed(2),
  type: row.type as TransactionType,
  currency: row.currency as Currency,
  occurredAt: row.occurredAt.toISOString(),
  note: row.note,
  category: row.category ? toCategory(row.category) : null,
  createdAt: row.createdAt.toISOString(),
});

/**
 * Суммы складываем в копейках: Decimal хранит два знака, а float на разнице
 * доходов и расходов дал бы хвост вида 0.30000000000000004. Потолок суммы —
 * Decimal(12,2), то есть меньше 10^12 копеек, что заметно ниже MAX_SAFE_INTEGER.
 *
 * @param value - Сумма из БД; `null`/`undefined` приходят от `_sum` по пустой группе.
 * @returns Целое число копеек; для пустой суммы — 0.
 * @throws Исключений не бросает.
 */
const toKopecks = (value: DecimalLike | null | undefined): number =>
  Math.round(Number(value?.toFixed(2) ?? '0') * 100);

/**
 * Обратное преобразование: копейки в строку контракта.
 *
 * @param value - Целое число копеек, может быть отрицательным (баланс).
 * @returns Сумма строкой с двумя знаками после запятой, например `-120.50`.
 * @throws Исключений не бросает.
 */
const fromKopecks = (value: number): string => (value / 100).toFixed(2);

/** Итог `groupBy` по типу операции. */
interface TypeTotal {
  type: string;
  sum: DecimalLike | null | undefined;
}

/** Итог `groupBy` по категории и типу; категория добрана отдельным запросом. */
interface CategoryTotal {
  type: string;
  sum: DecimalLike | null | undefined;
  category: Parameters<typeof toCategory>[0] | null;
}

/** Сырые итоги за месяц, которые сервис собирает из двух `groupBy`. */
interface SummaryInput {
  month: number;
  year: number;
  currency: Currency;
  byType: TypeTotal[];
  byCategory: CategoryTotal[];
}

/**
 * Собирает сводку за месяц: доходы, расходы, баланс и разбивку по категориям.
 *
 * Отсутствие группы в `byType` — это ноль, а не пропуск поля: месяц без доходов
 * должен отдавать `income: "0.00"`, иначе клиенту пришлось бы подставлять ноль
 * самому.
 *
 * @param input - Месяц, год, валюта и итоги двух `groupBy` из сервиса.
 * @returns Сводка в форме контракта; все суммы — строки, `balance` может быть
 * отрицательным.
 * @throws Исключений не бросает.
 */
export const toTransactionSummary = (input: SummaryInput): TransactionSummary => {
  const kopecksOf = (type: TransactionType): number =>
    toKopecks(input.byType.find((row) => row.type === type)?.sum);

  const income = kopecksOf('INCOME');
  const expense = kopecksOf('EXPENSE');

  const byCategory: CategorySummary[] = input.byCategory.map((row) => ({
    category: row.category ? toCategory(row.category) : null,
    type: row.type as TransactionType,
    total: fromKopecks(toKopecks(row.sum)),
  }));

  return {
    month: input.month,
    year: input.year,
    currency: input.currency,
    income: fromKopecks(income),
    expense: fromKopecks(expense),
    balance: fromKopecks(income - expense),
    byCategory,
  };
};
