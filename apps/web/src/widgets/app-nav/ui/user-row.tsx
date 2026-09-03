import type { AuthUser } from '@expence/contracts';

import { userDisplayName, userInitials } from '@/entities/session';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';

/**
 * Аватар на тёмном фоне: у `Avatar` фолбэк красится нейтральными токенами темы,
 * а рельса тёмная всегда, независимо от темы.
 */
export function DarkAvatar({
  user,
  size = 'sm',
  className,
}: {
  user: AuthUser | undefined;
  size?: 'sm' | 'default';
  className?: string;
}) {
  return (
    <Avatar size={size} className={cn('after:border-white/15', className)}>
      <AvatarFallback className="bg-white/10 text-[0.6875rem] font-semibold text-sidebar-foreground">
        {userInitials(user)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Имя и email внизу рельсы — как в референсе: подпись, а не кнопка. */
export function UserRow({ user }: { user: AuthUser | undefined }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <DarkAvatar user={user} size="default" />

      <div className="min-w-0">
        <p className="truncate font-heading text-sm font-semibold text-sidebar-foreground">
          {userDisplayName(user) || 'Профиль'}
        </p>
        <p className="truncate text-xs text-sidebar-muted">{user?.email ?? 'загружается...'}</p>
      </div>
    </div>
  );
}
