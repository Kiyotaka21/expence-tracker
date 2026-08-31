import type {
  CategorySummary,
  Currency,
  Transaction,
  TransactionSummary,
  TransactionType,
} from '@expence/contracts';

import { toCategory } from '../categories/category.mapper';

interface DecimalLike {
  toFixed: (digits: number) => string;
}

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
 */
const toKopecks = (value: DecimalLike | null | undefined): number =>
  Math.round(Number(value?.toFixed(2) ?? '0') * 100);

const fromKopecks = (value: number): string => (value / 100).toFixed(2);

interface TypeTotal {
  type: string;
  sum: DecimalLike | null | undefined;
}

interface CategoryTotal {
  type: string;
  sum: DecimalLike | null | undefined;
  category: Parameters<typeof toCategory>[0] | null;
}

interface SummaryInput {
  month: number;
  year: number;
  currency: Currency;
  byType: TypeTotal[];
  byCategory: CategoryTotal[];
}

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
