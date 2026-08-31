import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from './providers';

import './globals.css';

/**
 * Шрифт скачивается на этапе сборки, поэтому `next build` и первый `next dev`
 * требуют сети. Подмножество cyrillic обязательно: интерфейс русскоязычный.
 */
const geist = Geist({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-geist',
});

export const metadata: Metadata = {
  title: {
    default: 'Expence Tracker',
    template: '%s · Expence Tracker',
  },
  description: 'Трекер личных расходов',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning нужен next-themes: класс темы на <html>
    // появляется до гидратации, и разметка сервера с ним не совпадает.
    <html lang="ru" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
