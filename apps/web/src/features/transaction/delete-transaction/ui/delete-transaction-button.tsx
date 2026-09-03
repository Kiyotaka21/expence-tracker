'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { transactionApi, transactionKeys } from '@/entities/transaction';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';

interface DeleteTransactionButtonProps {
  id: string;
  /**
   * Вызывается после удаления. Нужен списку с пагинацией: если запись была на
   * странице последней, страницы после удаления не станет, и об этом знает
   * только тот, кто держит номер страницы.
   */
  onDeleted?: () => void;
}

export function DeleteTransactionButton({ id, onDeleted }: DeleteTransactionButtonProps) {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: transactionApi.remove,
    onSuccess: async () => {
      toast.success('Операция удалена');
      onDeleted?.();
      await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground hover:text-destructive"
      aria-label="Удалить операцию"
      disabled={remove.isPending}
      onClick={() => remove.mutate(id)}
    >
      {remove.isPending ? <Spinner /> : <Trash2Icon />}
    </Button>
  );
}
