import type { Metadata } from 'next';

import { redirectAfterAuth } from '@/shared/lib/redirect';
import { LoginPage } from '@/views/login';

export const metadata: Metadata = { title: 'Вход' };

interface LoginRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginRoute({ searchParams }: LoginRouteProps) {
  return <LoginPage redirectTo={redirectAfterAuth(await searchParams)} />;
}
