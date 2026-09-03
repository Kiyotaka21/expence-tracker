import type { ReactNode } from 'react';

import { ROUTES } from '@/shared/config/routes';
import { AppBrand } from '@/widgets/app-nav';

/**
 * Правовые документы открываются из формы регистрации в новой вкладке, поэтому
 * навигации приложения тут нет — только марка, как на экранах входа.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <AppBrand href={ROUTES.login} />

      <article className="rounded-3xl border border-border bg-card p-6 sm:p-9">{children}</article>
    </main>
  );
}
