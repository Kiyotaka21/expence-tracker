import type { Metadata } from 'next';

import { DashboardPage } from '@/views/dashboard';

export const metadata: Metadata = { title: 'Обзор' };

export default function DashboardRoute() {
  return <DashboardPage />;
}
