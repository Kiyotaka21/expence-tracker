import { WalletIcon } from 'lucide-react';
import Link from 'next/link';

import { ROUTES } from '@/shared/config/routes';
import { cn } from '@/shared/lib/utils';

/**
 * Марка приложения. Живёт в виджете навигации, но нужна и экранам входа —
 * поэтому размер знака параметризован, а цвета берутся у родителя.
 */
export function AppBrand({
  className,
  href = ROUTES.dashboard,
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn('flex items-center gap-2.5', className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <WalletIcon className="size-4.5" />
      </span>
      <span className="font-heading text-[0.9375rem] leading-tight font-extrabold">
        Expence Tracker
      </span>
    </Link>
  );
}
