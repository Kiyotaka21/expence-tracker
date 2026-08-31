import type { TransactionType } from '@expence/contracts';

/**
 * Подписи и знак живут в сущности, а не в форме: их одинаково показывают
 * и форма создания, и список, а это разные срезы соседних слоёв.
 */
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Доход',
  EXPENSE: 'Расход',
};

/** В БД суммы всегда положительные — направление операции задаёт тип. */
export const TRANSACTION_TYPE_SIGNS: Record<TransactionType, string> = {
  INCOME: '+',
  EXPENSE: '\u2212',
};
