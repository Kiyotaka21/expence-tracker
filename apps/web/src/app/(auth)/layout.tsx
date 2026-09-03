import type { ReactNode } from 'react';

import { ROUTES } from '@/shared/config/routes';
import { AppBrand } from '@/widgets/app-nav';

/**
 * Вход и регистрация: та же панель, что и в приложении, но разрезанная надвое —
 * тёмная половина с маркой и светлая с формой. Ниже `lg` тёмной половины нет:
 * на телефоне она отняла бы у формы весь первый экран.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh sm:flex sm:items-center sm:justify-center sm:p-6">
      <div className="grid min-h-dvh w-full max-w-[980px] min-w-0 bg-card sm:min-h-0 sm:rounded-3xl sm:border sm:border-border sm:shadow-[0_28px_70px_-40px_rgb(10_15_23_/_0.35)] lg:grid-cols-[minmax(0,0.85fr)_1fr]">
        <aside className="hidden flex-col justify-between gap-12 rounded-l-3xl bg-sidebar p-8 text-sidebar-foreground lg:flex">
          <AppBrand href={ROUTES.login} />

          <div>
            <p className="font-heading text-[1.75rem] leading-tight font-extrabold">
              Видно, куда ушли деньги за месяц
            </p>
            <p className="mt-4 text-sm leading-relaxed text-sidebar-muted">
              Доходы и расходы одной суммой, разбивка по категориям и вся история операций — на
              одном экране.
            </p>
          </div>
        </aside>

        <div className="flex flex-col justify-center px-5 py-10 sm:px-10">
          <AppBrand href={ROUTES.login} className="mb-10 lg:hidden" />

          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>
    </main>
  );
}
