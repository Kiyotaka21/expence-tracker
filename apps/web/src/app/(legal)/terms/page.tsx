import type { Metadata } from 'next';

import { TermsPage } from '@/views/terms';

export const metadata: Metadata = { title: 'Пользовательское соглашение' };

export default function TermsRoute() {
  return <TermsPage />;
}
