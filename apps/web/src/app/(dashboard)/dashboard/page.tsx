import type { Metadata } from 'next';

import { DashboardPage } from '@/views/dashboard';

export const metadata: Metadata = { title: 'Главная' };

export default function DashboardRoute() {
  return <DashboardPage />;
}
