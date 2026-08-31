'use client';

import { useSession, userDisplayName, userInitials } from '@/entities/session';
import { useTransactions } from '@/entities/transaction';
import { formatDate } from '@/shared/lib/format';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Card, CardContent } from '@/shared/ui/card';

/**
 * Карточка профиля на главном экране. Число операций берём из обычного списка
 * с `limit: 1` — нужен только `total`, а у такого запроса свой ключ кэша, так
 * что пагинацию основного списка он не задевает. Инвалидация по
 * `transactionKeys.all` обновляет счётчик вместе со всем остальным.
 */
export function ProfileCard() {
  const session = useSession();
  const count = useTransactions({ limit: 1 });

  return (
    <Card>
      <CardContent className="flex h-full items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback>{userInitials(session.data)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 space-y-0.5">
          <p className="truncate font-medium">{userDisplayName(session.data)}</p>
          <p className="truncate text-xs text-muted-foreground">{session.data?.email ?? ''}</p>
          <p className="text-xs text-muted-foreground">
            {session.data ? 'С нами с ' + formatDate(session.data.createdAt) : '—'}
            {count.data ? ' · операций: ' + count.data.total : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
