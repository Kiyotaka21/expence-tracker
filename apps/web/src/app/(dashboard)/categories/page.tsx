import type { Metadata } from 'next';

import { CategoriesPage } from '@/views/categories';

export const metadata: Metadata = { title: 'Категории' };

export default function CategoriesRoute() {
  return <CategoriesPage />;
}
