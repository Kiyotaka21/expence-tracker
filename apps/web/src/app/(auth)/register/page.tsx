import type { Metadata } from 'next';

import { redirectAfterAuth } from '@/shared/lib/redirect';
import { RegisterPage } from '@/views/register';

export const metadata: Metadata = { title: 'Регистрация' };

interface RegisterRouteProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterRoute({ searchParams }: RegisterRouteProps) {
  return <RegisterPage redirectTo={redirectAfterAuth(await searchParams)} />;
}
