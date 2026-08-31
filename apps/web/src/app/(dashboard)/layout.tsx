import type { ReactNode } from 'react';

import { AppHeader } from '@/widgets/app-header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">{children}</main>
    </div>
  );
}
