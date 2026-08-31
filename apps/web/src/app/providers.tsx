'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, type ReactNode } from 'react';

import { Toaster } from '@/shared/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient создаётся один раз на клиента, а не на модуль: иначе при SSR
  // кэш стал бы общим для всех запросов сервера.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    /*
     * Тёмная тема у shadcn включается классом `.dark`, а не медиавыражением,
     * поэтому его кто-то должен ставить: next-themes с defaultTheme="system"
     * следует настройке ОС. Переключателя в интерфейсе пока нет.
     */
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        {children}
        {/* Внутри ThemeProvider: Toaster читает тему через useTheme. */}
        <Toaster position="top-center" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
