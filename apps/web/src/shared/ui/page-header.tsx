import type { ReactNode } from 'react';

/**
 * Шапка экрана: заголовок дисплейным кеглем, подпись и место под действия
 * справа. Своя, не из реестра shadcn — там такого компонента нет, а разметку
 * повторяют все экраны сразу.
 */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-heading text-3xl leading-tight font-extrabold sm:text-[2rem]">
          {title}
        </h1>
        {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>

      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
