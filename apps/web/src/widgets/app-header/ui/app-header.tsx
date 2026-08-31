'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSession } from '@/entities/session';
import { LogoutButton } from '@/features/auth/logout';
import { ROUTES } from '@/shared/config/routes';
import { cn } from '@/shared/lib/utils';

const NAV_LINKS = [
  { href: ROUTES.dashboard, label: 'Обзор' },
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

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {session.data?.name ?? session.data?.email ?? ''}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
