'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSession } from '@/entities/session';
import { LogoutButton } from '@/features/auth/logout';
import { cn } from '@/shared/lib/utils';

import { AppBrand } from './app-brand';
import { NAV_ITEMS } from './nav-items';
import { UserRow } from './user-row';

/**
 * Тёмная рельса навигации — левая часть панели приложения. Прилипает к верху
 * окна и занимает его по высоте: на длинных списках операций разделы и профиль
 * должны оставаться на месте.
 *
 * Ниже `lg` рельсы нет — там работает `AppTopbar`.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const session = useSession();

  return (
    <aside className="sticky top-8 hidden h-[calc(100dvh-4rem)] w-[264px] shrink-0 flex-col gap-8 self-start rounded-l-3xl bg-sidebar p-5 text-sidebar-foreground lg:flex">
      <AppBrand />

      <nav className="flex flex-col gap-1" aria-label="Разделы">
        <p className="mb-1 px-3 label-micro text-sidebar-muted">Главное</p>

        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 font-heading text-sm font-semibold text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
                active && 'bg-sidebar-accent text-sidebar-foreground',
              )}
            >
              {/* Полоса у самого края рельсы: отступ группы съедает -left-5. */}
              {active ? (
                <span
                  aria-hidden
                  className="absolute top-1/2 -left-5 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary"
                />
              ) : null}

              <Icon className={cn('size-4.5', active && 'text-sidebar-primary')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-4">
        <UserRow user={session.data} />

        <LogoutButton
          variant="ghost"
          className="w-full justify-start px-3 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
        />
      </div>
    </aside>
  );
}
