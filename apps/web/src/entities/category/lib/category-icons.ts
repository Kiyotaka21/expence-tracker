import {
  BookIcon,
  BusIcon,
  DumbbellIcon,
  GiftIcon,
  HeartPulseIcon,
  HouseIcon,
  PhoneIcon,
  PlaneIcon,
  ShoppingCartIcon,
  TicketIcon,
  UtensilsIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';

/**
 * Слаги иконок категорий. Совпадают с теми, что кладут сиды
 * (apps/api/prisma/seed.ts), поэтому демо-данные отрисовываются как есть.
 *
 * Набор фиксированный: в БД `icon` — свободная строка, а рисовать произвольное
 * имя нельзя без карты слаг → компонент. Карта статическая, поэтому в бандл
 * попадают только перечисленные иконки lucide, а не весь набор.
 */
export const CATEGORY_ICONS = [
  'shopping-cart',
  'utensils',
  'bus',
  'home',
  'ticket',
  'heart-pulse',
  'wallet',
  'gift',
  'plane',
  'book',
  'dumbbell',
  'phone',
] as const;

export type CategoryIconSlug = (typeof CATEGORY_ICONS)[number];

/** Подписи для выбора иконки в форме — рядом с набором, чтобы не разъезжались. */
export const CATEGORY_ICON_LABELS: Record<CategoryIconSlug, string> = {
  'shopping-cart': 'Покупки',
  utensils: 'Еда',
  bus: 'Транспорт',
  home: 'Жильё',
  ticket: 'Развлечения',
  'heart-pulse': 'Здоровье',
  wallet: 'Кошелёк',
  gift: 'Подарки',
  plane: 'Путешествия',
  book: 'Образование',
  dumbbell: 'Спорт',
  phone: 'Связь',
};

/**
 * Карта слаг → компонент lucide. Экспортируется целиком, а не через функцию:
 * правило react-hooks/static-components считает компонент, полученный из
 * вызова функции внутри рендера, созданным на месте.
 */
export const CATEGORY_ICON_COMPONENTS: Record<CategoryIconSlug, LucideIcon> = {
  'shopping-cart': ShoppingCartIcon,
  utensils: UtensilsIcon,
  bus: BusIcon,
  home: HouseIcon,
  ticket: TicketIcon,
  'heart-pulse': HeartPulseIcon,
  wallet: WalletIcon,
  gift: GiftIcon,
  plane: PlaneIcon,
  book: BookIcon,
  dumbbell: DumbbellIcon,
  phone: PhoneIcon,
};

/** Неизвестный слаг (или его отсутствие) — не ошибка: вызывающий рисует заглушку. */
export const isCategoryIconSlug = (slug: string | null): slug is CategoryIconSlug =>
  slug !== null && slug in CATEGORY_ICON_COMPONENTS;
