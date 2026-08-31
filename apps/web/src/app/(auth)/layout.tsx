import { WalletIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <WalletIcon className="size-5 text-primary" />
          <span className="font-heading text-base font-semibold">Expence Tracker</span>
        </div>

        {children}
      </div>
    </main>
  );
}
