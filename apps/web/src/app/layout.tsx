import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from './providers';

import './globals.css';

/**
 * Шрифты скачиваются на этапе сборки, поэтому `next build` и первый `next dev`
 * требуют сети. Подмножество cyrillic обязательно: интерфейс русскоязычный.
 *
 * Inter — текст и контролы, Manrope — заголовки, навигация и суммы: у него
 * плотные тяжёлые начертания, на которых держится дисплейная типографика
 * дашборда. Оба переменные, поэтому вес выбирается классом, а не отдельными
 * загрузками.
 */
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-manrope',
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
    <html lang="ru" className={inter.variable + ' ' + manrope.variable} suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
