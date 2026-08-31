'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

import { transactionApi, transactionKeys } from '@/entities/transaction';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';

export function DeleteTransactionButton({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: transactionApi.remove,
    onSuccess: async () => {
      toast.success('Транзакция удалена');
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
      className="text-destructive"
      aria-label="Удалить транзакцию"
      disabled={remove.isPending}
      onClick={() => remove.mutate(id)}
    >
      {remove.isPending ? <Spinner /> : <Trash2Icon />}
    </Button>
  );
}
