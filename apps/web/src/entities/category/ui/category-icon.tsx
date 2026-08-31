import { cn } from '@/shared/lib/utils';

import { CATEGORY_ICON_COMPONENTS, isCategoryIconSlug } from '../lib/category-icons';

interface CategoryIconProps {
  slug: string | null;
  color?: string | null;
  className?: string;
}

/**
 * Иконка категории. В БД `icon` — свободная строка, поэтому неизвестный слаг
 * (или его отсутствие) деградирует до цветной точки, а не ломает вёрстку.
 * Цвет приходит инлайн-стилем: он из данных, а не из палитры темы.
 */
export function CategoryIcon({ slug, color, className }: CategoryIconProps) {
  const style = color ? { color } : undefined;

  if (!isCategoryIconSlug(slug)) {
    return (
      <span
        aria-hidden
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center text-muted-foreground',
          className,
        )}
        style={style}
      >
        {/* bg-current наследует color: инлайн-стиль с цветом категории бьёт класс. */}
        <span className="size-2.5 rounded-full bg-current" />
      </span>
    );
  }

  const Icon = CATEGORY_ICON_COMPONENTS[slug];

  return (
    <Icon
      aria-hidden
      className={cn('size-5 shrink-0 text-muted-foreground', className)}
      style={style}
    />
  );
}
