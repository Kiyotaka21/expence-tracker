'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSession, userDisplayName, userInitials } from '@/entities/session';
import { LogoutButton } from '@/features/auth/logout';
import { ROUTES } from '@/shared/config/routes';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

const NAV_LINKS = [
  { href: ROUTES.dashboard, label: 'Главная' },
  { href: ROUTES.transactions, label: 'Транзакции' },
  { href: ROUTES.categories, label: 'Категории' },
];

export function AppHeader() {
  const pathname = usePathname();
  const session = useSession();

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <nav className="flex items-center gap-4">
          <span className="font-heading font-semibold">Expence Tracker</span>

          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={cn(
                'text-sm text-muted-foreground transition-colors hover:text-foreground',
                pathname === link.href && 'font-medium text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/*
         * Профиль спрятан в меню: раньше имя и кнопка выхода занимали место в
         * шапке на любом экране, а нужны они изредка.
         */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Меню профиля">
              <Avatar size="sm">
                <AvatarFallback>{userInitials(session.data)}</AvatarFallback>
              </Avatar>
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
    </header>
  );
}
