'use client';

import { PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { CategoryForm } from '@/features/category/category-form';
import { TransactionForm } from '@/features/transaction/transaction-form';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

type Creating = 'transaction' | 'category';

const DIALOGS: Record<Creating, { title: string; description: string }> = {
  transaction: {
    title: 'Новая транзакция',
    description: 'Доход или расход: сумма, категория и дата',
  },
  category: {
    title: 'Новая категория',
    description: 'Название, цвет и иконка для разметки трат',
  },
};

/**
 * Меню создания: транзакция или категория. Композиция двух фич возможна только
 * на слое widgets — фичам запрещено импортировать соседний срез, а формы
 * транзакции и категории лежат в разных срезах.
 *
 * Диалог один на оба случая: заголовок и поведение общие, различается лишь
 * форма внутри, а форма сама закрывает диалог через `onDone`.
 */
export function CreateMenu() {
  const [creating, setCreating] = useState<Creating | null>(null);
  const dialog = creating ? DIALOGS[creating] : null;

  const close = (): void => setCreating(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <PlusIcon />
            Создать
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setCreating('transaction')}>
            Транзакцию
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCreating('category')}>Категорию</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {dialog ? (
            <>
              <DialogHeader>
                <DialogTitle>{dialog.title}</DialogTitle>
                <DialogDescription>{dialog.description}</DialogDescription>
              </DialogHeader>

              {creating === 'transaction' ? (
                <TransactionForm onDone={close} />
              ) : (
                <CategoryForm onDone={close} />
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
