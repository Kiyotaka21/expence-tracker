import Link from 'next/link';

import { LoginForm } from '@/features/auth/login';
import { ROUTES } from '@/shared/config/routes';

interface LoginPageProps {
  /** Путь, на который вернуться после входа. */
  redirectTo: string;
}

export function LoginPage({ redirectTo }: LoginPageProps) {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-heading text-2xl leading-tight font-extrabold">Вход</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Учёт расходов начинается здесь</p>
      </div>

      <LoginForm redirectTo={redirectTo} />

      <p className="text-sm text-muted-foreground">
        Нет аккаунта?{' '}
        <Link href={ROUTES.register} className="font-medium text-primary hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}
