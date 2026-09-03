'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { categoryApi, categoryKeys } from '@/entities/category';
import { transactionKeys } from '@/entities/transaction';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';

const CONFIRM = 'Удалить категорию? Расходы останутся, но потеряют привязку к категории.';

export function DeleteCategoryButton({ id, name }: { id: string; name?: string }) {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: categoryApi.remove,
    onSuccess: async () => {
      toast.success('Категория удалена');

      // У Transaction.categoryId стоит onDelete: SetNull — транзакции остаются,
      // но их вложенная категория меняется, поэтому гасим и кэш транзакций.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      ]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      aria-label={name ? 'Удалить категорию ' + name : 'Удалить категорию'}
      disabled={remove.isPending}
      onClick={() => {
        if (window.confirm(CONFIRM)) {
          remove.mutate(id);
        }
      }}
    >
      {remove.isPending ? <Spinner /> : <Trash2Icon />}
      <span className="hidden sm:inline">Удалить</span>
    </Button>
  );
}
