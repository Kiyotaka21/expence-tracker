'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOutIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { sessionApi, sessionErrorMessage } from '@/entities/session';
import { ROUTES } from '@/shared/config/routes';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';

export function LogoutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const logout = useMutation({
    mutationFn: sessionApi.logout,
    onSuccess: () => {
      // Кэш чистим целиком: в нём лежат данные ушедшего пользователя.
      queryClient.clear();
      toast.success('Вы вышли из аккаунта');

      router.replace(ROUTES.login);
      router.refresh();
    },
    // Выход упирается в refresh-cookie: если её больше нет, сессия уже мертва,
    // но access-cookie ещё жива — остаёмся на месте и говорим об этом.
    onError: (error) => {
      toast.error(sessionErrorMessage(error) ?? 'Не удалось выйти');
    },
  });

  return (
    <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
      {logout.isPending ? <Spinner /> : <LogOutIcon />}
      Выйти
    </Button>
  );
}
