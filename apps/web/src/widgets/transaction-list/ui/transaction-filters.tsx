'use client';

import { TRANSACTION_TYPES, type TransactionType } from '@expence/contracts';

import { useCategories } from '@/entities/category';
import { TRANSACTION_TYPE_LABELS } from '@/entities/transaction';
import { Button } from '@/shared/ui/button';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

export interface TransactionFiltersValue {
  /** Пустая строка — «все»: `<select>` не умеет отдавать undefined. */
  type: TransactionType | '';
  categoryId: string;
}

export const EMPTY_FILTERS: TransactionFiltersValue = { type: '', categoryId: '' };

export const isFiltered = (value: TransactionFiltersValue): boolean =>
  value.type !== '' || value.categoryId !== '';

interface TransactionFiltersProps {
  value: TransactionFiltersValue;
  onChange: (value: TransactionFiltersValue) => void;
}

/**
 * Фильтры списка. API принимает `type` и `categoryId` как есть, поэтому здесь
 * только перевод «пустая строка → отсутствие параметра» и сброс.
 */
export function TransactionFilters({ value, onChange }: TransactionFiltersProps) {
  const categories = useCategories();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        size="sm"
        aria-label="Тип операции"
        value={value.type}
        onChange={(event) =>
          // Значения приходят из наших же `<option>`, других вариантов нет.
          onChange({ ...value, type: event.target.value as TransactionType | '' })
        }
      >
        <NativeSelectOption value="">Все операции</NativeSelectOption>
        {TRANSACTION_TYPES.map((type) => (
          <NativeSelectOption key={type} value={type}>
            {TRANSACTION_TYPE_LABELS[type]}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      <NativeSelect
        size="sm"
        aria-label="Категория"
        disabled={categories.isPending}
        value={value.categoryId}
        onChange={(event) => onChange({ ...value, categoryId: event.target.value })}
      >
        <NativeSelectOption value="">Все категории</NativeSelectOption>
        {(categories.data ?? []).map((category) => (
          <NativeSelectOption key={category.id} value={category.id}>
            {category.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>

      {isFiltered(value) ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          Сбросить
        </Button>
      ) : null}
    </div>
  );
}
