import type { ReactNode } from 'react';

import { AppSidebar, AppTopbar } from '@/widgets/app-nav';

/**
 * Панель приложения: тёмная рельса и содержимое лежат в одном скруглённом
 * прямоугольнике, который «плывёт» по градиенту холста — отсюда тень и предел
 * по ширине. Ниже `sm` панель занимает экран целиком: на телефоне поля вокруг
 * неё только отнимают место у списков.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh sm:p-4 lg:p-8">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1360px] bg-card sm:min-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:border sm:border-border sm:shadow-[0_28px_70px_-40px_rgb(10_15_23_/_0.35)] lg:min-h-[calc(100dvh-4rem)]">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar />
          <main className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-9 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
