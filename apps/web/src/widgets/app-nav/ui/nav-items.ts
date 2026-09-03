import { ArrowLeftRightIcon, LayoutDashboardIcon, TagsIcon, type LucideIcon } from 'lucide-react';

import { ROUTES } from '@/shared/config/routes';

/**
 * Разделы приложения в одном месте: их показывают и рельса, и мобильная шапка.
 * Иконки берём компонентами, а не по имени — правило `react-hooks/static-components`
 * запрещает получать компонент из вызова функции в рендере.
 */
export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: ROUTES.dashboard, label: 'Обзор', icon: LayoutDashboardIcon },
  { href: ROUTES.transactions, label: 'Операции', icon: ArrowLeftRightIcon },
  { href: ROUTES.categories, label: 'Категории', icon: TagsIcon },
];
