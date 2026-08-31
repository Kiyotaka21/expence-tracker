import type { Metadata } from 'next';

import { PrivacyPage } from '@/views/privacy';

export const metadata: Metadata = { title: 'Политика конфиденциальности' };

export default function PrivacyRoute() {
  return <PrivacyPage />;
}
