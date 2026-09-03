'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSession, userDisplayName } from '@/entities/session';
import { LogoutButton } from '@/features/auth/logout';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

import { AppBrand } from './app-brand';
import { NAV_ITEMS } from './nav-items';
import { DarkAvatar } from './user-row';

/**
 * Мобильная шапка вместо рельсы: тот же тёмный фон и те же разделы, но в строку.
 * Выдвижной панели нет намеренно — разделов три, и они помещаются в ряд
 * таблеток, который к тому же не отнимает у списка операций высоту.
 */
export function AppTopbar() {
  const pathname = usePathname();
  const session = useSession();

  return (
    <header className="flex flex-col gap-3 bg-sidebar px-4 py-4 text-sidebar-foreground sm:rounded-t-3xl sm:px-6 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <AppBrand />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Меню профиля"
              className="hover:bg-sidebar-accent"
            >
              <DarkAvatar user={session.data} />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-1.5 py-1">
              <p className="truncate text-sm font-medium">{userDisplayName(session.data)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {session.data?.email ?? 'Профиль загружается...'}
              </p>
            </div>

            <DropdownMenuSeparator />

            <div className="p-1">
              <LogoutButton variant="ghost" className="w-full justify-start" />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label="Разделы">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 font-heading text-[0.8rem] font-semibold text-sidebar-muted transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
                active && 'bg-sidebar-accent text-sidebar-foreground',
              )}
            >
              <Icon className={cn('size-4', active && 'text-sidebar-primary')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
