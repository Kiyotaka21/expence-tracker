import type { Category } from '@expence/contracts';

interface CategoryLike {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  createdAt: Date;
}

export const toCategory = (row: CategoryLike): Category => ({
  id: row.id,
  name: row.name,
  color: row.color,
  icon: row.icon,
  createdAt: row.createdAt.toISOString(),
});
