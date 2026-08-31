import { WalletIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Правовые документы открываются из формы регистрации в новой вкладке, поэтому
 * шапки приложения тут нет — только марка, как на экранах входа.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <div className="flex items-center gap-2">
        <WalletIcon className="size-5 text-primary" />
        <span className="font-heading text-base font-semibold">Expence Tracker</span>
      </div>

      {children}
    </main>
  );
}
