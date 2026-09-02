import type { Category } from '@expence/contracts';

/**
 * Строка категории из БД — то, что принимает маппер. Структурный тип вместо
 * импорта сгенерированного Prisma-типа: мапперы намеренно о Prisma не знают,
 * поэтому принимают и подгруженную связь транзакции, и результат `findMany`.
 */
interface CategoryLike {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  createdAt: Date;
}

/**
 * Приводит строку категории к форме контракта: `createdAt` из `Date` в ISO-строку,
 * служебные поля (`userId`, `updatedAt`) наружу не попадают.
 *
 * @param row - Строка категории из БД.
 * @returns Категория в форме контракта `@expence/contracts`.
 * @throws Исключений не бросает.
 */
export const toCategory = (row: CategoryLike): Category => ({
  id: row.id,
  name: row.name,
  color: row.color,
  icon: row.icon,
  createdAt: row.createdAt.toISOString(),
});
